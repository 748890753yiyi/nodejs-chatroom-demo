var DB = require('../DBClient');
var config = require('../config');
var dao=require('./groupDao');

var atService=module.exports={
    //�洢������Ϣ
    'add':function(doc,callback){
        dao.insert(doc,config.dbAt,function(doc1){
            callback(doc1);
        })
    },
	//ɾ��������Ϣ����at��
	'del':function(informationId,callback){
		dao.deleteAt({informationId:informationId},config.dbAt,function(doc1){
            callback(doc1);
        })
	}
}