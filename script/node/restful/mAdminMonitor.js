var Restful = require("../Restful");
var config = require('../config');
var Dao = require("../dao");
var AdminMonitor = module.exports = Restful.extend({
    initialize: function () {
        this.dao = Dao.new(config.dbInformation);

    },
    //监控
    monitorList: function (req,res) {
        var self=this;
        var page = req.param("page");
        var condition=JSON.parse(req.param('conditions'));
        var name=condition.name;
        page = JSON.parse(page);
        var pageSize = page.pageSize;
        var pageNum = page.pageNo;
        var query={};
        if(name){
            query={'basic.name':{$regex:name},'basic.type':'loginMonitor'}
        }else{
            query['basic.type']='loginMonitor';
        }
        self.dao.total(query, function (total) {
            self.dao.list(query,null,{'basic.loginTime':-1},pageNum,pageSize, function (docs) {
                var returnValue={'status':'success',list:docs,total:total};
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(returnValue);
                res.end(str);
            })
        })
    }
})