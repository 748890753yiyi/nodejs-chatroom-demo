var DB = require('../DBClient');
var config = require('../config');
var dao=require('./groupDao');

var atService=module.exports={
    //存储聊天信息
    'add':function(doc,callback){
        dao.insert(doc,config.dbAt,function(doc1){
            callback(doc1);
        })
    },
	//删除聊天信息中有at的
	'del':function(informationId,callback){
		dao.deleteAt({informationId:informationId},config.dbAt,function(doc1){
            callback(doc1);
        })
	}
}