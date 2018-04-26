var DB = require('../DBClient');
var config = require('../config');
var dao=require('./groupDao');

var chatService=module.exports={
    //存储聊天信息
    'add':function(doc,callback){
        dao.insert(doc,config.dbInformation,function(doc1){
            callback(doc1);
        })
    },
    //删除聊天信息
    'delete':function(id,callback){
        dao.delete(id,config.dbInformation,function(doc){
            callback(doc);
        })
    }
}