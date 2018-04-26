var DB = require('../DBClient');
var config = require('../config');
var dao=require('./groupDao');

var companyService=module.exports={
    //用户加入到公司内
    'addUser':function(id,company){
        dao.update({id:id},{"$push":{companyInformation:company}},config.dbUser,function(doc){

        });
    },
    //获取公司基本信息
    'basic':function(companyId,callBack){
        dao.get({id:companyId},{role:0,_id:0},config.dbCompany,function(doc){
            var obj={};
            obj.id=doc.id;
            obj.name=doc.basic.name;
            callBack(obj);
        })
    }
}