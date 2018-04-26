var fileSystem = require("fs"); 
var path = require('path');
var then=require('thenjs');
var ffmpeg = require('fluent-ffmpeg');
var gm = require('gm');
var config = require('./config');
var DB = require('./DBClient');
var child_process=require('child_process');

exports.fileCommon = function(request, response){
    var scriptName = request.url;
	var requestdFilePath = path.join(process.cwd(), scriptName);
	 if(!fileSystem.existsSync(requestdFilePath)){
		 response.writeHead(404);   
		response.end();
		return;  
	 }

	 if(requestdFilePath.indexOf('.css')>0)
			  response.writeHead(200, {"Content-Type": "text/css"});
	else if(requestdFilePath.indexOf('.js')>0)
	  response.writeHead(200, {"Content-Type": "application/x-javascript"});
	else if(requestdFilePath.indexOf('.png')>=0)
	  response.writeHead(200,{"Content-Type":"image/png"});
	  else if(requestdFilePath.indexOf('.gif')>=0)
	  response.writeHead(200,{"Content-Type":"image/gif"});
	else if(requestdFilePath.indexOf('.jpg')>=0)
	  response.writeHead(200,{"Content-Type":"image/jpeg"});
	else if(requestdFilePath.indexOf('.mp4')>=0||requestdFilePath.indexOf('.MP4')>=0)
	  response.writeHead(200,{"Content-Type":"video/mp4"});
	else if(requestdFilePath.indexOf('.webm')>=0||requestdFilePath.indexOf('.WEBM')>=0)
	  response.writeHead(200,{"Content-Type":"video/webm"});
	else
	  response.writeHead(200, {"Content-Type": "text/html"});
	  
	var readstream = fileSystem.createReadStream(requestdFilePath);
	readstream.on('data', function(chunk) {
		   response.write(chunk);
	});
	readstream.on('error', function(error) {
		   console.error('filecommom error: '+error);
	});
	readstream.on('end', function() {
		response.end();
	});
};

exports.fileWrite = function(request, response){
    var scriptName = request.url.substr(8);
    var requestdFilePath='';
    if(fileSystem.existsSync(config.simplifyFileSavePath+scriptName)){
        requestdFilePath=config.simplifyFileSavePath+scriptName;
    }
    if(fileSystem.existsSync(config.originalFileSavePath+scriptName)){
        requestdFilePath=config.originalFileSavePath+scriptName;
    }
    if(fileSystem.existsSync(config.webmFileSavePath+scriptName)){
        requestdFilePath=config.webmFileSavePath+scriptName;
    }
    if(fileSystem.existsSync(config.headFileSavePath+scriptName)){
        requestdFilePath=config.headFileSavePath+scriptName;
    }

    if(!fileSystem.existsSync(requestdFilePath)){
        response.writeHead(404);
        response.end();
        return;
    }

    if(requestdFilePath.indexOf('.css')>0)
        response.writeHead(200, {"Content-Type": "text/css"});
    else if(requestdFilePath.indexOf('.js')>0)
        response.writeHead(200, {"Content-Type": "application/x-javascript"});
    else if(requestdFilePath.indexOf('.png')>=0)
        response.writeHead(200,{"Content-Type":"image/png"});
    else if(requestdFilePath.indexOf('.gif')>=0)
        response.writeHead(200,{"Content-Type":"image/gif"});
    else if(requestdFilePath.indexOf('.jpg')>=0)
        response.writeHead(200,{"Content-Type":"image/jpeg"});
    else if(requestdFilePath.indexOf('.mp4')>=0||requestdFilePath.indexOf('.MP4')>=0)
        response.writeHead(200,{"Content-Type":"video/mp4"});
    else if(requestdFilePath.indexOf('.webm')>=0||requestdFilePath.indexOf('.WEBM')>=0)
        response.writeHead(200,{"Content-Type":"video/webm"});
    else
        response.writeHead(200, {"Content-Type": "text/html"});

    var readstream = fileSystem.createReadStream(requestdFilePath);
    readstream.on('data', function(chunk) {
        response.write(chunk);
    });
    readstream.on('error', function(error) {
        console.error('filewrite error: '+error);
    });
    readstream.on('end', function() {
        response.end();
    });

};

exports.fileUpload = function(req, res){
    var groupId=req.param('groupId');
    var now = new Date();
    var currentDate = now.format("yyyyMMdd");
    if(!fileSystem.existsSync("./upload/upload/"+currentDate)){
        fileSystem.mkdirSync("./upload/upload/"+currentDate , 0777);
    }
    if(!fileSystem.existsSync(config.simplifyFileSavePath+groupId)){
        fileSystem.mkdirSync(config.simplifyFileSavePath+groupId , 0777);
    }
    if(!fileSystem.existsSync(config.originalFileSavePath+groupId)){
        fileSystem.mkdirSync(config.originalFileSavePath+groupId , 0777);
    }
    if (req.files && req.files.file != 'undefined') {
        var temp_path = req.files.file.path;
        var temp_name=temp_path.replace("upload/upload_tmp/","").replace("upload\\upload_tmp\\","");
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
                            .write(config.simplifyFileSavePath+groupId+'/simplify'+temp_name, function(err){
                                if (err) {
                                    console.error('imageMagick error: '+ err);
                                }
                                url='/server/'+groupId+'/'+temp_name;
                                realUrl=url;
                                thumbnail_url='/server/'+groupId+'/simplify'+temp_name;
                                type='image';
                                defer(null);
                            })
                    });
                }
                else if(postfix == "flv" || postfix == "mp4" || postfix == "wmv" || postfix== "avi" || postfix== "3gp" || postfix== "rmvb"|| postfix== "mkv"){
                    if(!fileSystem.existsSync(config.webmFileSavePath+groupId)){
                        fileSystem.mkdirSync(config.webmFileSavePath+groupId , 0777);
                    }
                    var newName=temp_name.substring(0,temp_name.lastIndexOf('.'))+'.jpg';
                    var newVieoName=temp_name.substring(0,temp_name.lastIndexOf('.'))+'.webm';
                    //生成缩略图
                    var ffmpeg=child_process.spawn("ffmpeg",[
                        '-ss', 0,
                        '-i', target_path,
                        '-vcodec', 'mjpeg',
                        '-vframes', '1',
                        '-an',
                        '-f', 'rawvideo',
                        '-s', '70x70',
                        "pipe:1"
                    ]);

                    var writeStream = fileSystem.createWriteStream(config.simplifyFileSavePath+groupId+'/simplify'+newName);
                    ffmpeg.stdout.on('data', function(chunk)
                    {
                        writeStream.write(chunk);
                        thumbnail_url='/server/'+groupId+'/simplify'+newName;
                        realUrl='/server/'+groupId+'/'+temp_name;
                        type='video';
                        url='/server/'+groupId+'/vieo'+newVieoName;
                        defer(null);
                    });
                    //转换视频
                    var proc = new ffmpeg({ source:target_path,timeout:10000 })
                        .toFormat('webm')
                        .saveToFile(config.webmFileSavePath+groupId+'/vieo'+newVieoName, function (retcode, error) {
                        });
                }
                else if(postfix == "html"||postfix == "htm"){
                    thumbnail_url='/images/html.png';
                    type='other';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "xls"||postfix == "xlsx"){
                    thumbnail_url='/images/excel.png';
                    type='other';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "mp3"||postfix == "wma"){
                    thumbnail_url='/images/music.png';
                    type='audio';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "ppt"||postfix == "pptx"){
                    thumbnail_url='/images/ppt.png';
                    type='other';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "txt"||postfix == "gnt"){
                    thumbnail_url='/images/text.png';
                    type='other';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "doc"||postfix == "docx"){
                    thumbnail_url='/images/word.png';
                    type='other';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "zip"||postfix == "rar" ||postfix == "jar" ||postfix == "tar"){
                    thumbnail_url='/images/zip.png';
                    type='other';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else if(postfix == "pdf"){
                    thumbnail_url='/images/pdf.png';
                    type='other';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                else{
                    thumbnail_url='/images/unknown.png';
                    type='other';
                    url='/server/'+groupId+'/'+temp_name;
                    realUrl=url;
                    defer(null);
                }
                //存储实际上传文件
                fileSystem.stat(target_path, function(err1, stats) {
                    if (err1) {
                        console.error('file stat error: '+err1);
                    } else {
                        var fileReadStream = fileSystem.createReadStream(target_path, { highWaterMark: config.highWaterMark });
                        var writeStream1 = fileSystem.createWriteStream(config.originalFileSavePath+groupId+'/'+temp_name);
                        var len = 0;
                        fileReadStream.on("data", function (chunk){
                            len += chunk.length;
                            writeStream1.write(chunk);
                            if (writeStream1.write(chunk) === false) {
                                fileReadStream.pause();
                            }
                        });
                        fileReadStream.on('end', function() {
                            writeStream1.end();
                        });

                        writeStream1.on('drain', function() {
                            fileReadStream.resume();
                        });
                    }
                });

            }).then(function (defer) {
                res.writeHead(200, {"Content-Type": "text/html"});
                var formData = {
                    "name": req.files.file.name,
                    "size": req.files.file.size,
                    "url":url,
                    "imageUrl":thumbnail_url,
                    "type":'F',
					"format":postfix,
					"classify":type
                };

                var file={};
                file.mainId=groupId;
                file.name=req.files.file.name;
                file.size=req.files.file.size;
                file.parentId=groupId;
                file.type='F';
                file.url=realUrl;
                file.imageUrl=thumbnail_url;
                file.classify=type;
				file.format=postfix;
                file.downloadCount=0;
                var str = JSON.stringify(formData);
                res.end(str);
            })
        });
    }
}; 


exports.fileDelete = function(req, res){
    var tmpUrl=config.simplifyFileSavePath+req.param('tmpUrl').substr(8);
    var url=config.originalFileSavePath+req.param('url').substr(8);
    var groupId=req.param('groupId');
    var thenObj=then(function(defer){
        fileSystem.unlink(url,function(err){
            if(err){
                console.error('fileDelete url error: '+err);
            }
            defer(null);

        });
    }).then(function(defer){
		if(tmpUrl.indexOf('simplify')>0){
            fileSystem.unlink(tmpUrl,function(err){
                console.error('fileDelete tmpUrl error: '+err);
                defer(null);
            });
		}else{
			defer(null);
		}
    }).then(function(defer){
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end("finish");
    })
};

exports.fileDownload = function(req, res){
    var fileName=decodeURIComponent(req.param('fileName'));
    var filePath1=decodeURIComponent(req.param('filePath'));
    var filePath=config.originalFileSavePath+filePath1.substr(8);
    var userAgent = (req.headers['user-agent']||'').toLowerCase();
    if(userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0) {
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(fileName));
    } else if(userAgent.indexOf('firefox') >= 0) {
        res.setHeader('Content-Disposition', 'attachment; filename*="utf8\'\'' + encodeURIComponent(fileName)+'"');
    } else {
        res.setHeader('Content-Disposition', 'attachment; filename=' + new Buffer(fileName).toString('binary'));
    }
    then(function(defer) {
        DB.client(function (db) {
            DB.collection(db, config.dbFile, function (collection) {
                collection.update({url: filePath1}, {"$inc": {downloadCount: 1}}, {upsert: true}, function (err, doc) {
                    if (err) {
                        console.error('fileDownload update error: ' + err);
                    }
                    DB.close(db);
                    defer(null);
                });
            });
        })
    }).then(function (defer) {
        var fReadStream = fileSystem.createReadStream(filePath);
        fReadStream.on('data', function (chunk) {
            if(!res.write(chunk)){//判断写缓冲区是否写满(node的官方文档有对write方法返回值的说明)
                fReadStream.pause();//如果写缓冲区不可用，暂停读取数据
            }
        });
        fReadStream.on('end', function () {
            res.end();
        });
        res.on("drain", function () {//写缓冲区可用，会触发"drain"事件
            fReadStream.resume();//重新启动读取数据
        });
    })
}

exports.headUpload = function(req, res){
    if (req.files && req.files.file != 'undifined') {
        if(!fileSystem.existsSync(config.headFileSavePath)){
            fileSystem.mkdirSync(config.headFileSavePath , 0777);
        }
        var str="";
        var temp_path = req.files.file.path;
        var temp_name=temp_path.replace("upload/upload_tmp/","").replace("upload\\upload_tmp\\","");
        var postfix = temp_name.match(/^(.*)(\.)(.{1,8})$/)[3].toLowerCase(); //获得选择的上传文件的后缀名的正则表达式
        if(postfix == "gif" || postfix == "jpeg" || postfix == "jpg" || postfix== "png"){
            var imageMagick = gm.subClass({ imageMagick : true });
            imageMagick(temp_path).size(function(err,size) {
                if (err){
                    console.error('headUpload gm error : '+err);

                }
                var tempSize='';
                if(size.width>=112&&size.height>=112){
                    tempSize=112;
                }else if(size.width>=112&&size.height<112){
                    tempSize=size.height;
                }else if(size.width<112&&size.height>=112){
                    tempSize=size.width;
                }else{
                    if(size.width<size.height){
                        tempSize=size.width;
                    }else{
                        tempSize=size.height;
                    }
                }
                imageMagick(temp_path).resize(tempSize, tempSize, '!').autoOrient()
                    .write(config.headFileSavePath+'head'+temp_name, function(err){
                        if (err) {
                            console.error('headUpload write simply error: '+err);
                        }
                    });
            });
            var file = {
                "name": req.files.file.name,
                "size": req.files.file.size,
                "url":'/server/'+'head'+temp_name
            };
            str = JSON.stringify(file);
            res.end(str);
        }else{
            var formData = {
                "url" : ''
            };
            str = JSON.stringify(formData);
            res.end(str);
        }
    }
};

// 粘贴上传
exports.uploadImageByPaste = function(req, res){
    //1.获取客户端传来的src_str字符串=>判断是base64还是普通地址=>获取图片类型后缀(jpg/png etc)
    //=>如果是base64替换掉"前缀"("data:image\/png;base64," etc)
    //2.base64 转为 buffer对象 普通地址则先down下来
    //3.写入硬盘(后续可以将地址存入数据库)
    //4.写入数据库
    var groupId=req.param('groupId');
    var src_str = req.body.file,
        timestr = new Date().format("yyyyMMdd"),
        timestamp = new Date().getTime();
    if(!fileSystem.existsSync("./upload/upload/"+timestr)){
        fileSystem.mkdirSync("./upload/upload/"+timestr , 0777);
    }
    if(!fileSystem.existsSync(config.simplifyFileSavePath+groupId)){
        fileSystem.mkdirSync(config.simplifyFileSavePath+groupId , 0777);
    }
    if(!fileSystem.existsSync(config.originalFileSavePath+groupId)){
        fileSystem.mkdirSync(config.originalFileSavePath+groupId , 0777);
    }
    then(function (defer) {
        if (src_str.match(/^data:image\/png;base64,|^data:image\/jpg;base64,|^data:image\/jpeg;base64,|^data:image\/bmp;base64,/) ) {
            //处理截图 src_str为base64字符串
            var pic_suffix = src_str.split(';',1)[0].split('/',2)[1];
            if(pic_suffix=="jpeg"){
                pic_suffix="jpg";
            }
            var base64 = src_str.replace(/^data:image\/png;base64,|^data:image\/jpg;base64,|^data:image\/jpeg;base64,|^data:image\/bmp;base64,/, ''),
                buf = new Buffer(base64, 'base64'),
                store_path = './upload/upload/'+timestr+'/' + timestamp + '.' + pic_suffix;
            fileSystem.writeFile(store_path, buf, function (err) {
                if (err) {
                    throw err;
                } else {
                    defer(null,pic_suffix,store_path);
                }
            });
        }else {// 处理非chrome的网页图片 src_str为图片地址
            var temp_array = src_str.split('.'),
                pic_suffix = temp_array[temp_array.length - 1],
                store_path = './upload/upload/'+timestr+'/' + timestamp + '.' + pic_suffix,
                wstream = fileSystem.createWriteStream(store_path);
            req(src_str).write(wstream);
            wstream.on('finish', function (err) {
                if( err ) {
                    throw err;
                } else {
                    defer(null,pic_suffix,store_path);
                }
            });
        }
    }).then(function(defer,pic_suffix,store_path){
        var postfix = pic_suffix,
            temp_name = timestamp + '.' + pic_suffix,
            target_path = store_path;
        var thumbnail_url="";
        var url='';
        var realUrl='';
        var type='';
        var size='';
        var thenObj = then(function (defer) {
            var imageMagick = gm.subClass({ imageMagick: true });
            imageMagick(target_path).size(function(err,size) {
                if (err) {
                    console.error('gm error :    ' + err);

                }
                /*
                 * 比例满足宽：高=屏幕以内的按照比例缩减
                 * 比例大于屏幕比的则按照
                 *  34*100 极端长
                 * 118*42 极端宽，高度低
                 * */
                var proportion = size.height /  size.width;
                var tempWidth = '', tempHeight = '';
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
                    .write(config.simplifyFileSavePath+groupId+'/simplify'+temp_name, function(err){
                        if (err) {
                            console.error("imageMagick resize error: "+err);
                        }
                        url='/server/'+groupId+'/'+temp_name;
                        realUrl=url;
                        thumbnail_url='/server/'+groupId+'/simplify'+temp_name;
                        type='image';
                        defer(null);
                    })
            });
        }).then(function (defer) {
            //存储实际上传文件
            fileSystem.stat(target_path, function(err1, stats) {
                if (err1) {
                    console.error('stat error: '+err1);
                } else {
                    var fileReadStream = fileSystem.createReadStream(target_path, { highWaterMark: config.highWaterMark });
                    var writeStream = fileSystem.createWriteStream(config.originalFileSavePath+groupId+'/'+temp_name);
                    var len = 0;
                    fileReadStream.on("data", function (chunk){
                        len += chunk.length;
                        if (writeStream.write(chunk) === false) {
                            fileReadStream.pause();
                        }
                    });
                    fileReadStream.on('end', function() {
                        writeStream.end();
                        defer(null);
                    });

                    writeStream.on('drain', function() {
                        fileReadStream.resume();
                    });
                }
            });
        }).then(function (defer) {
            res.writeHead(200, {"Content-Type": "text/html"});
            var formData = {
                "name": temp_name,
                "size": size,
                "url":url,
                "imageUrl":thumbnail_url,
                "type":'F',
                "format":postfix,
                "classify":type
            };
            var str = JSON.stringify(formData);
            res.end(str);
        })
    })
};