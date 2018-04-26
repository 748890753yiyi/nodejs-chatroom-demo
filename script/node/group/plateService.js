var DB = require('../DBClient');
var config = require('../config');
var dao=require('./groupDao');

var plateService=module.exports={
    //公共组将不在平台上的用户加入到组内
    'addUser':function(id,contactValue){
        dao.update({id:id},{"$push":{contactInformation:{contactValue:contactValue}}},config.dbUser,function(doc){

        });
    }
}