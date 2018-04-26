var DB = require('../DBClient');
var config = require('../config');
var then = require('thenjs');
var uuid = require('node-uuid');
var eventproxy=require('eventproxy');
var cacheData = require('../cacheData');
var dao=require('./groupDao');

var announcement=module.exports={
    //公告列表,包含全部和最新公告
    list:function(req,res){
        var type=req.param('type');//all或者new
        var groupId=req.param('groupId');
        var pageSize=parseInt(req.param('pageSize'));
        var pageNo=parseInt(req.param('pageNo'));
        var query={};
        var condition={};
        if(type=='new'){
            query={'basic.groupId':groupId,'basic.type':'announcement'};
            condition={'sort':{'basic.publishTime':-1},'skip':(pageNo-1)*pageSize,'limit':pageSize};
        }else if(type=='all'){
            query={'basic.groupId':groupId,'basic.type':'announcement'};
            condition={'sort':{'basic.publishTime':-1},'skip':(pageNo-1)*pageSize,'limit':pageSize};
        }
        dao.total(query,config.dbInformation,function(count){
            dao.list(query,condition,config.dbInformation,function(docs){		
				var counter=0;
                if(docs.length>0){
                    docs.forEach(function(doc){
                        var tempUserId=doc.basic.userId;
						doc.basic.userName="";
                            doc.basic.head="";
						dao.findOne({id:tempUserId},config.dbUser,function(user){
                            counter++;
                            if(user){
                                doc.basic.userName=user.basic.userName;
                                doc.basic.head=user.basic.head;
                            }

                            if(counter==docs.length){
                                var tempDoc={};
                                tempDoc.list=docs;
                                tempDoc.total=count;
                                res.writeHead(200, {"Content-Type": "text/html"});
                                var str = JSON.stringify(tempDoc);
                                res.end(str);
                            }
						})
                    })
                }else{
                    var tempDoc={};
                    tempDoc.list=docs;
                    tempDoc.total=count;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                }
            })
        })
    },
    //管理员删除公告
    delAnnouncement:function(req,res){
        var id=req.param('id');
        var result={status:'success',msg:"删除成功"};
        dao.delete(id,config.dbInformation,function(doc){
            if(!doc){
                result={status:'failed',msg:"删除失败"};
            }
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        })
    }
}