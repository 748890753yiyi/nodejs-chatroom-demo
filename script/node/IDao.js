var Base = require("./base");
var IDao = module.exports = Base.extend({
	
	total:function(query,callBack){},
	
    list:function(query,fields,sorts,pageNo,pageSize,callBack){},
	
	insert:function(doc,callBack){},
	
	get:function(id,callBack){},
	
	update:function(doc,callBack){},
	
	'delete':function(id,callBack){}
});

