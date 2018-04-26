var DB = require('../DBClient');
var config = require('../config');
var dao=require('./groupDao');

var informationService=module.exports={
    //添加信息
    'add':function(doc,callback){
        dao.insert(doc,config.dbInformation,function(doc1){
            var tempDoc={};
            if(doc1){
                tempDoc={status:'success'}
            }else{
                tempDoc={status:'failed'}
            }
            callback(tempDoc);
        });
    },
	//获取信息
	'get':function(query,callback){
		dao.get(query,{},config.dbInformation,function(doc){
			callback(doc);
		})
	},
	//获取信息列表
    'list':function(query,condition,callback){
        dao.list(query,condition,config.dbInformation,function(docs){
            callback(docs);
        })
    },
	//修改各种请求信息状态
    updateState:function(informationId,type,callback){
        dao.update({id:informationId},{"$set":{"basic.state":type}},config.dbInformation,function(doc){
            callback(doc);
        })
    },
    //修改请求信息状态
    updateStates:function(informationId,type,callback){
        dao.update({id:informationId},{"$set":{"basic.state":type}},config.dbInformation,function(doc){
            var tempDoc={};
            if(doc){
                tempDoc={status:'success'}
            }else{
                tempDoc={status:'failed'}
            }
            callback(tempDoc);
        })
    },
	//修改聊天窗口撤销信息时数据undo状态
	updateUndo:function(msgId,type,callback){
		dao.update({id:msgId},{"$set":{"basic.undo":type}},config.dbInformation,function(doc){
            callback(doc);
        })
	}
	
	
}