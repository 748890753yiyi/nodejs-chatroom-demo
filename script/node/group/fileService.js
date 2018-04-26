var DB = require('../DBClient');
var config = require('../config');
var dao=require('./groupDao');

var fileService=module.exports={
    //聊天窗口文件添加
    'addChatFile':function(doc,callback){
        dao.insert(doc,config.dbFile,function(doc1){
            callback(doc1);
        })
    },
    //聊天窗口撤销带文件的消息时删除相应的文件
    'delChatFile':function(id,callback){
        dao.delete(id,config.dbFile,function(doc){
            callback(doc);
        })
    }
}