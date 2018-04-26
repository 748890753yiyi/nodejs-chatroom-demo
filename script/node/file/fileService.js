var config = require('../config');
var then=require('thenjs');
var DB = require('../DBClient');
var gm = require('gm');
var ffmpeg = require('fluent-ffmpeg');
var path = require('path');
var archiver = require('archiver');
var fileSystem = require("fs");
var dao=require('./fileDao');
var uuid = require('node-uuid');
var thrift = require('../thriftClient');
var FileStorage = require('./gen-nodejs/FileManager.js');
var fileTypes = require('./gen-nodejs/FileManager_types');
var child_process=require('child_process');

//文件列表
exports.list=function(req,res){
	var mainId=req.param('mainId');
	var parentId=req.param('parentId');
	var pageNo=req.param('pageNo');
	var pageSize=req.param('pageSize');
    var type=req.param('type');
    var query={};
	//全部文件（包括文件夹）
    if(type==''||type==undefined){
        query={"mainId":mainId,"parentId":parentId};
    }else{
		//不同文件类型（音频，视频，文档等）
        query={"mainId":mainId,classify:type};
    }
	var condition={"sort":{"type":1,"createTime":1},'skip':(pageNo-1)*pageSize,"limit":pageSize}
	dao.total(query,config.dbFile,function(count){
		dao.list(query,condition,config.dbFile,function(docs){
			var tempDoc={};
			tempDoc.total=count;//总数
			tempDoc.list=docs;
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(tempDoc);
			res.end(str);
		})
	})
};
	
//添加文件夹
 exports.addDirectory=function(req,res){
	var userId=req.cookies.userid;
	var file=req.body;
	file.size=0;
	file.type='D';
	file.imageUrl=config.directoryImageUrl;
	var fileRemote = new fileTypes.File(file);
	thrift.client(FileStorage,'File',function(connection,client){
		thrift.call(client,'add',[fileRemote,userId],function(msg){
			var result={};
			if(msg=='success'){
				result.status='success';
				result.msg='添加成功!'
			}else{
				result.status='failed';
				result.msg='添加失败!'
			}
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(result);
			res.end(str);
			thrift.close(connection);
		});
	});

};
	
//上传文件
exports.uploadFile=function(req,res){
	var mainId=req.param("mainId");//网盘上传mainId=userId,组内上传mainId=groupId
	var parentId=req.param("parentId");
	var now = new Date();
	var currentDate = now.format("yyyyMMdd");
	if(!fileSystem.existsSync("./upload/upload/"+currentDate)){
	fileSystem.mkdirSync("./upload/upload/"+currentDate , 0777);
	}
    /*if(!fileSystem.existsSync(config.fileSavePath)){
        fileSystem.mkdirSync(config.fileSavePath , 0777);
    }*/
    if(!fileSystem.existsSync(config.simplifyFileSavePath+mainId)){
        fileSystem.mkdirSync(config.simplifyFileSavePath+mainId , 0777);
    }
    if(!fileSystem.existsSync(config.originalFileSavePath+mainId)){
        fileSystem.mkdirSync(config.originalFileSavePath+mainId , 0777);
    }
	if (req.files && req.files.file != 'undefined') {
		var temp_path = req.files.file.path;
        //console.log('看看文件：'+temp_path);
		var temp_name=temp_path.replace("upload/upload_tmp/","").replace("upload\\upload_tmp\\","");
        //console.log('看看文件名：'+temp_name);
        var type=req.files.file.type;
		var target_path = "./upload/upload/"+currentDate+"/" + temp_name;
		fileSystem.rename(temp_path, target_path, function (err) {
			var postfix = temp_name.match(/^(.*)(\.)(.{1,8})$/)[3].toLowerCase(); //获得选择的上传文件的后缀名的正则表达式
			var thumbnail_url="";
			var url='';
			var realUrl='';
			var type='';
			var thenObj = then(function (defer) {
				if(postfix == "gif" || postfix == "jpeg" || postfix == "jpg" || postfix== "png"){
                    var imageMagick = gm.subClass({ imageMagick : true });
                    imageMagick(target_path).size(function(err,size) {
                        if (err) {
                            console.error('gm error :    ' + err);

                        }
                        /*
                         * 比例满足宽：高=4:3以内的按照比例缩减
                         * 比例大于3:4则按照
                         *  34*100 极端长
                         * 118*42 极端宽，高度低
                         * */
                        var proportion = size.height /  size.width;
                        var tempWidth = '', tempHeight = '';
//                                console.log('proportion  '+proportion);
                        if(proportion < 0.5 || proportion > 2){
                            if(size.width > size.height ){
                                tempWidth = 118;
                                tempHeight = 42;
                            }else{
                                tempWidth = 34;
                                tempHeight = 100;
                            }
                        }else{
                            if (size.width >= 118 && size.height >= 100) {
                                if(size.width > size.height ){
                                    proportion = 118 / size.width;
                                    tempWidth = 118;
                                    tempHeight = size.height * proportion;
                                }else{
                                    proportion = 100 / size.height;
                                    tempWidth = size.width * proportion;
                                    tempHeight = 100;
                                }
                            } else if (size.width >= 118 && size.height < 100) {
                                proportion = 118 / size.width;
                                tempWidth = 118;
                                tempHeight = size.height * proportion;
                            } else if (size.width < 118 && size.height >= 100) {
                                proportion = 100 / size.height;
                                tempWidth = size.width * proportion;
                                tempHeight = 100;
                            } else {
                                tempWidth = size.width;
                                tempHeight = size.height;
                            }
                        }
                        imageMagick(target_path).resize(tempWidth, tempHeight, '!').autoOrient()
                            .write(config.simplifyFileSavePath+mainId+'/simplify'+temp_name, function(err){
                                if (err) {
                                    console.error(err);
                                }
                                //console.log('缩略图完成');
                                url='/server/'+mainId+'/'+temp_name;
                                realUrl=url;
                                thumbnail_url='/server/'+mainId+'/simplify'+temp_name;
                                type='image';
                                defer(null);
                            })
                    });

				}
				else if(postfix == "flv" || postfix == "mp4" || postfix == "wmv" || postfix== "avi" || postfix== "3gp" || postfix== "rmvb"|| postfix== "mkv"){
					var newName=temp_name.substring(0,temp_name.lastIndexOf('.'))+'.jpg';
					//var newVieoName=temp_name.substring(0,temp_name.lastIndexOf('.'))+'.webm';
					//生成缩略图
                    var ffmpeg=child_process.spawn("ffmpeg",[
                        '-ss', 0,
                        '-i', target_path,
                        '-vcodec', 'mjpeg',
                        '-vframes', '1',
                        '-an',
                        '-f', 'rawvideo',
                        '-s', '70x70',
                        //'-y', "test-shot\\1_screenshot_300_1.jpg"                   // Output to STDOUT
                        "pipe:1"
                    ]);
                    var writeStream = fileSystem.createWriteStream(config.simplifyFileSavePath+mainId+'/simplify'+newName);
                    ffmpeg.stdout.on('data', function(chunk)
                    {
                        writeStream.write(chunk);
                        thumbnail_url='/server/'+mainId+'/simplify'+newName;
                        realUrl='/server/'+mainId+'/'+temp_name;
                        type='video';
                        url=realUrl;
                        defer(null);
                    });
					
				}
                else if(postfix == "html"||postfix == "htm"){
                    thumbnail_url='/images/html.png';
                    type='other';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "xls"||postfix == "xlsx"){
                    thumbnail_url='/images/excel.png';
                    type='other';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "mp3"||postfix == "wma"){
                    thumbnail_url='/images/music.png';
                    type='audio';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "ppt"||postfix == "pptx"){
                    thumbnail_url='/images/ppt.png';
                    type='other';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "txt"||postfix == "gnt"){
                    thumbnail_url='/images/text.png';
                    type='other';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "doc"||postfix == "docx"){
                    thumbnail_url='/images/word.png';
                    type='other';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "zip"||postfix == "rar" ||postfix == "jar" ||postfix == "tar"){
                    thumbnail_url='/images/zip.png';
                    type='other';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "pdf"){
                    thumbnail_url='/images/pdf.png';
                    type='other';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else{
                    thumbnail_url='/images/unknown.png';
                    type='other';
                    url='/server/'+mainId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                //存储实际上传文件
                fileSystem.stat(target_path, function(err1, stats) {
                    if (err1) {
                        console.error('stat error: '+err1);
                    } else {
                        var fileReadStream = fileSystem.createReadStream(target_path, { highWaterMark: config.highWaterMark });
                        var writeStream1 = fileSystem.createWriteStream(config.originalFileSavePath+mainId+'/'+temp_name);
                        var len = 0;
                        fileReadStream.on("data", function (chunk){
                            len += chunk.length;
                            if (writeStream1.write(chunk) === false) {
                                fileReadStream.pause();
                            }
                        });
                        fileReadStream.on('end', function() {
                            writeStream1.end();
                            //console.log('实际文件上传完成');
                        });

                        writeStream1.on('drain', function() {
                            fileReadStream.resume();
                        });
                    }
                });

			}).then(function (defer) {
				var file={};
				file.mainId=mainId;
				file.name=req.files.file.name;
				file.size=req.files.file.size;
				file.format=postfix;
				file.parentId=parentId;
				file.type='F';
				file.url='/server/'+mainId+'/'+temp_name;
				file.imageUrl=thumbnail_url;
				file.classify=type;
				
				var userId=req.cookies.userid;
				
				var fileRemote = new fileTypes.File(file);
				thrift.client(FileStorage,'File',function(connection,client){
					thrift.call(client,'add',[fileRemote,userId],function(msg){
						var result={};
						result.msg=msg;
						result.file=file;
						res.writeHead(200, {"Content-Type": "text/html"});
						var str = JSON.stringify(result);
						res.end(str);
						thrift.close(connection);
					});
				});
			})
		});
	}
};
	

exports.deleteFile=function(req,res){
	var mainId=req.param('mainId');
	var id=req.param('id');
	var thenObj=then(function(defer){
		dao.findOne({id:id},config.dbFile,function(doc){
			if(doc){
				defer(null);
			}else{
				var tempDoc={};
				tempDoc.status='failed';
				tempDoc.msg='文件不存在，请刷新页面后操作！';
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(tempDoc);
				res.end(str);
			}
		})
	}).then(function(defer){
		thrift.client(FileStorage,'File',function(connection,client){
			thrift.call(client,'remove',[id,mainId],function(msg){
				var result={};
				if(msg=='success'){
					result.status='success';
					result.msg='删除成功!'
				}else{
					result.status='failed';
					result.msg='删除失败!'
				}
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(result);
				res.end(str);
				thrift.close(connection);
			});
		});
	})
};

//文件重命名
exports.rename=function(req,res){
	var mainId=req.body.mainId;
	var name=req.body.name;
	var id=req.body.id;
	var userId=req.cookies.userid;
	thrift.client(FileStorage,'File',function(connection,client){
		thrift.call(client,'rename',[id,name,mainId,userId],function(msg){
			var result={};
			if(msg=='success'){
				result.status='success';
				result.msg='重命名成功!'
			}else{
				result.status='failed';
				result.msg='重命名失败!'
			}
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(result);
			res.end(str);
			
			thrift.close(connection);
		});
	});
};
//循环下载的文件
function foreach(db,downloadFiles,defer,archive,count){
	if(downloadFiles.length>count){
		var file=downloadFiles[count];
        var fileName1=config.originalFileSavePath+file.url.substr(8);
        var fileReadStream = fileSystem.createReadStream(fileName1, { highWaterMark: config.highWaterMark });
        archive.append(fileReadStream, { name: file.name });
        count++;
        if(count==downloadFiles.length){
            defer(null,archive);
        }else{
            foreach(db,downloadFiles,defer,archive,count);
        }
	}
};	
	
//文件夹下载
exports.directoryDownload=function(req,res){
	var id=req.param('id');
	var mainId=req.param('mainId');
	var query={};
	var pattern = new RegExp("^.*"+id+".*$");
	query.url = pattern;
	query.type='D';
	DB.client(function(db){
		DB.collection(db,config.dbFile,function(collection){
			collection.find(query,{"sort":{"createTime":1}}).toArray(function(err,docs){
				var inArray=[];
				var dir={};
				var downloadName;
				for(var i=0;i<docs.length;i++){
					var doc=docs[i];
					inArray.push(doc.id);
					if(doc.parentId!='-1'){
						var parentName=dir[doc.parentId];
						dir[doc.id]=parentName+'/'+doc.name;
					}else{

						dir[doc.id]=doc.name;
					}

					if(doc.id==id){
						downloadName=doc.name;
					}
				}
				collection.find({'parentId':{'$in':inArray},'type':'F'},{"sort":{"createTime":1}}).toArray(function(err,files){
                    files.forEach(function(file){
                        DB.client(function(db1){
                            DB.collection(db1,config.dbFile,function(collection){
                                collection.update({id:file.id},{"$inc":{downloadCount:1}},{upsert:true},function(err,doc){
                                    //console.log("下载文件夹时修改子文件下载数");
                                    if(err){
                                        console.error('update error: '+err);
                                    }
                                    DB.close(db1);

                                })
                            })
                        })
                    })
                    var f=[];
					for(var i=0;i<files.length;i++){

						var file=files[i];
						var dirName=dir[file.parentId];
						f.push({'name':dirName+"/"+file.name,'url':file.url});
					}
					res.header('Content-Type', 'application/zip');
					var userAgent = (req.headers['user-agent']||'').toLowerCase();
					var fileName=downloadName+".zip";
					if(userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0) {
						res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(fileName));
					} else if(userAgent.indexOf('firefox') >= 0) {
						res.setHeader('Content-Disposition', 'attachment; filename*="utf8\'\'' + encodeURIComponent(fileName)+'"');
					} else {
						/* safari等其他非主流浏览器只能自求多福了 */
						res.setHeader('Content-Disposition', 'attachment; filename=' + new Buffer(fileName).toString('binary'));
					}

					var thenObj = then(function (defer) {
						var archive = archiver('zip');
						archive.pipe(res);
						var count = 0;

						foreach(db, f, defer, archive, 0);

					}).then(function (defer, archive) {
						archive.finalize();
						DB.close(db);
					});
				});
			});
		});
	});
};
//批量下载
exports.batchDownload=function(req,res){
	var ids=req.param('ids');
	var query;
	if(ids instanceof Array){
		query={'id':{'$in':ids}};
	}else{
		query={'id':ids};
	}
    var downloadFiles2=[];//单层文件
    var tempFiles=[];
	DB.client(function(db) {
		DB.collection(db, config.dbFile, function (collection) {
			collection.find(query).toArray(function (err, files) {
				var downloadFiles = [];
				var rootDirectory = [];
				var oldName;
				if (files) {
					for (var i = 0; i < files.length; i++) {
						var file = files[i];
						if (file.type == 'D') {
							var query = {};
							var pattern = new RegExp("^.*" + file.id + ".*$");
							query.url = pattern;
							query.type = 'D';
							rootDirectory.push(query);
						} else {
                            //选中的单文件数组downloadFiles
                            downloadFiles2.push(file);
							downloadFiles.push({'name': file.name, 'url': file.url});
						}

						if (i == 0) {
							oldName = "(" + file.name + "...)等";
						}
					}
				}

				collection.find({"$or": rootDirectory}, {"sort": {"createTime": 1}}).toArray(function (err, docs) {
					var inArray = [];
					var dir = {};
					if (docs) {
						for (var i = 0; i < docs.length; i++) {
							var doc = docs[i];
							inArray.push(doc.id);
							if (doc.parentId != '-1') {
								var parentName = dir[doc.parentId];
								dir[doc.id] = doc.name;
							} else {
								dir[doc.id] = doc.name;
							}

						}
					}


					collection.find({'parentId': {'$in': inArray}, 'type': 'F'}, {"sort": {"createTime": 1}}).toArray(function (err, files) {
                        tempFiles=files;
                        var files2=[];
                        files2=tempFiles.concat(downloadFiles2);
                        if(files2.length>0){
                            files2.forEach(function(file){
                                DB.client(function(db1){
                                    DB.collection(db1,config.dbFile,function(collection){
                                        collection.update({id:file.id},{"$inc":{downloadCount:1}},{upsert:true},function(err,doc){
                                            if(err){
                                                console.error('update error: '+err);
                                            }
                                            DB.close(db1);

                                        })
                                    })
                                })
                            })
                        }


                        if (files) {
							for (var i = 0; i < files.length; i++) {
								var file = files[i];
								var dirName = dir[file.parentId];
								downloadFiles.push({'name': dirName + "/" + file.name, 'url': file.url});
							}
						}
						//DB.close(db);

						res.header('Content-Type', 'application/zip');
						var userAgent = (req.headers['user-agent'] || '').toLowerCase();
						var fileName = oldName + "批量下载.zip";
						if (userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0) {
							res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(fileName));
						} else if (userAgent.indexOf('firefox') >= 0) {
							res.setHeader('Content-Disposition', 'attachment; filename*="utf8\'\'' + encodeURIComponent(fileName) + '"');
						} else {
							/* safari等其他非主流浏览器只能自求多福了 */
							res.setHeader('Content-Disposition', 'attachment; filename=' + new Buffer(fileName).toString('binary'));
						}
						//DB.client(function(db){
						var thenObj = then(function (defer) {
							var archive = archiver('zip');
							archive.pipe(res);
							var count = 0;
							foreach(db, downloadFiles, defer, archive, 0);

						}).then(function (defer, archive) {
							archive.finalize();
							DB.close(db);
						});

//								archive.finalize();
					});
				});
			});
		});
	});
};

//文件移动
exports.fileMoveTo=function(req,res){
	var mainId=req.body.mainId;
	var id=req.body.id;
	var moveToParentId=req.body.toId;
	var userId=req.cookies.userid;
	thrift.client(FileStorage,'File',function(connection,client){
		thrift.call(client,'moveTo',[id,mainId,userId,moveToParentId],function(msg){
			var result={};
			if(msg=='success'){
				result.status='success';
				result.msg='文件移动成功!'
			}else{
				result.status='failed';
				result.msg='文件移动失败!'
			}
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(result);
			res.end(str);               
			thrift.close(connection);
		});
	});
};
//文件复制
exports.fileCopy=function(req,res){
	var toId=req.body.toId;
	var file=req.body.file;
	file.parentId=toId;
	var userId=req.cookies.userid;
	var fileRemote = new fileTypes.File(file);
	thrift.client(FileStorage,'File',function(connection,client){
		thrift.call(client,'add',[fileRemote,userId],function(msg){
			var result={};
			if(msg=='success'){
				result.status='success';
				result.msg='文件复制完成!'
			}else{
				result.status='failed';
				result.msg='文件复制失败!'
			}
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(result);
			res.end(str);               
			thrift.close(connection);
		});
	});
};
//组右下角最新文件列表
exports.lastFileList = function(req, res){
	var mainId=req.param('mainId');
	var pageNo=req.param('pageNo');
	var query={mainId:mainId,type:'F'};
	var condition={"sort":{"createTime":-1},"limit":pageNo};
	dao.list(query,condition,config.dbFile,function(docs){
		res.writeHead(200, {"Content-Type": "text/html"});
		var str = JSON.stringify(docs);
		res.end(str);
	})
};
//搜索文件
exports.queryFilesList=function(req,res){
	var mainId=req.param('mainId');
	var parentId=req.param('parentId');
	var fname=req.param('name');
	var pageSize = req.param('pageSize');
	var pageNo=req.param('pageNo');
	var type=req.param('type');
	var query={};
    //console.log('fname: '+fname);
	var condition={"sort":{'type':1,"createTime":1},"skip":(pageNo-1)*pageSize,"limit":pageSize};
	var result={};
	var total=0;
	if(type==''||type==undefined){
		query={"mainId":mainId,"parentId":parentId,"name":{$regex:fname,$options: 'i'}};
	}else{
		query={"mainId":mainId,classify:type,"name":{$regex:fname,$options: 'i'}};
	}
	dao.total(query,config.dbFile,function(count){
		dao.list(query,condition,config.dbFile,function(docs){
			var tempDoc={};
			tempDoc.list=docs;
			tempDoc.total=count;
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(tempDoc);
			res.end(str);
		})
	})
};
//文件夹列表
exports.directoryList=function(req,res){
	var mainId=req.param('mainId');
	var parentId=req.param('parentId');
	var query={mainId:mainId,type:'D'};
	var condition={"sort":{"createTime":1}};
	dao.list(query,condition,config.dbFile,function(docs){
		res.writeHead(200, {"Content-Type": "text/html"});
		var str = JSON.stringify(docs);
		res.end(str);
	})
};
//聊天框发送消息
exports.addMessageFiles=function(messageId,companyId,userId,files,callback){
	thrift.client(FileStorage,'File',function(connection,client){
		thrift.call(client,'addMessageFiles',[messageId,companyId,userId,files],function(msg){
			//console.log('java上传聊天框文件');
			if(msg=='success'){
				callback(msg);
			}else{
				callback('failed')
			}
			thrift.close(connection);
		});
	});
};
//聊天框删除消息中文件夹
exports.abandonMessageFiles=function(messageId,callback){
	//console.log('撤销时候调用了我');
	dao.list({messageId:messageId},{},config.dbFile,function(docs){
		var ids=[];
		if(docs.length>0){
			//console.log('我的信息有文件');
			docs.forEach(function(doc){
				ids.push(doc.id);
			})
			var len=ids.length;
			var count=0;
			ids.forEach(function(id,i){
				//console.log('我要进行循环');
				then(function(defer){
					dao.findOne({id:id},config.dbFile,function(doc){
						if(doc){
							defer(null,doc)
						}else{
							var tempDoc={};
							tempDoc.status='failed';
							tempDoc.msg='文件不存在，请刷新页面后操作！';
							res.writeHead(200, {"Content-Type": "text/html"});
							var str = JSON.stringify(tempDoc);
							res.end(str);
						}
					})
				}).then(function(defer,doc){
					//删除真实文件
					var url=config.originalFileSavePath+doc.url.substr(8);
                    fileSystem.unlink(url,function(err){
                        //console.log(url+"删除");
                        defer(null);

                    });
				}).then(function(defer,doc){
					//删除缩略图
					if(doc.classify&&doc.classify!='other'){
						var imageUrl=config.simplifyFileSavePath+doc.imageUrl.substr(8);
                        fileSystem.unlink(imageUrl,function(){
                            //console.log(imageUrl+"删除");
                            defer(null);
                        });
					}else{
						defer(null);
					}
				}).then(function(defer){
					count++;
					if(count==len){
						//console.log('java即将执行撤销聊天框文件');
						thrift.client(FileStorage,'File',function(connection,client){
							thrift.call(client,'abandonMessageFiles',[messageId],function(msg){
								if(msg=='success'){
									callback(msg);
								}else{
									callback('failed');
								}
								thrift.close(connection);
							});
						});
					}
				})
			})
		}else{
			//console.log('我的信息没有有文件');
			callback('failed');
		}
	})

}; 

//文件列表按要求排序
exports.fileList=function(req,res){
    var mainId=req.param('mainId');
    var parentId=req.param('parentId');
    var pageNo=req.param('pageNo');
    var pageSize=req.param('pageSize');
    var type=req.param('type');
    var sort=req.param('sort');
    var query={},option={},condition={};
    var counter=0;
    if(type==''||type==undefined){
        query={mainId:mainId,"parentId":parentId};
        if(sort=='createTime'){//创建时间逆序
            condition={'sort':{type:1,'createTime':-1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }else if(sort=='size'){//文件大小排序（从小到大）
            condition={'sort':{type:1,'size':-1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }else if(sort=='format'){//文件类型排序
            condition={'sort':{type:1,'format':1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }else if(sort=='name'){//文件名称排序
            condition={'sort':{type:1,'name':1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }else{
            condition={'sort':{type:1,'createTime':1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }
    }else{
        //不同文件类型（音频，视频，文档等）
        query={"mainId":mainId,classify:type};
        if(sort=='createTime'){//创建时间逆序
            condition={'sort':{type:1,'createTime':-1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }else if(sort=='size'){//文件大小排序（从小到大）
            condition={'sort':{type:1,'size':-1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }else if(sort=='format'){//文件类型排序
            condition={'sort':{type:1,'format':1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }else if(sort=='name'){//文件名称排序
            condition={'sort':{type:1,'name':1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }else{
            condition={'sort':{type:1,'createTime':1},'skip':(pageNo-1)*pageSize,"limit":pageSize};
        }
    }
    var tempQuery={};
    dao.total(query,config.dbFile,function(count){
        dao.list(query,condition,config.dbFile,function(docs){
            if(docs.length>0){
                docs.forEach(function(doc){
                    doc.createUserName="";
                    if(doc.type=="D"&&doc.name=="临时文件夹"){
                        tempQuery={id:doc.userId}
                    }else{
                        tempQuery={id:doc.createUserId}
                    }
                    dao.findOne(tempQuery,config.dbUser,function(user){
                        counter++;
                        if(user){
                            doc.createUserName=user.basic.userName;

                        }
                        if(counter==docs.length){
                            var tempDoc={};
                            tempDoc.total=count;//总数

                            tempDoc.list=docs;
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var str = JSON.stringify(tempDoc);
                            res.end(str);
                        }
                    })
                })
            }else{
                var tempDoc={};
                tempDoc.total=count;//总数
                tempDoc.list=docs;
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(tempDoc);
                res.end(str);
            }

        })
    })
};