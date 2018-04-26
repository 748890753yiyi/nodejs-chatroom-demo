var IRestful = require("./IRestful");
var uuid = require('node-uuid');
var Restful = module.exports = IRestful.extend({
	initialize: function(dao) {
		this.dao=dao;
    },
analysisCondition:function(condition,query){
		var operate=condition.operate
		var field=condition.field;
		var dataType=condition.dataType;
		var value=condition.value;
		if(dataType){
			if(dataType=='date'){
				if(typeof value =='string'){
				    if(!isNaN(value)){
					    value=new Date(parseInt(value));
					}else{
					    var arr1 = value.split("-");
						if(arr1.length==3&&!isNaN(arr1[0])&&!isNaN(arr1[1])&&!isNaN(arr1[2])){
							value = new Date(arr1[0],parseInt(arr1[1])-1,arr1[2]);
						}else{
							value = new Date(condition.value);
						}
					}
				}else if(typeof value =='number'){
				    value=new Date(value);
				}
				if(value=='Invalid Date'){
					   value=new Date();
				}
			}else if(dataType=='null'){
				value=null;
			}
		}
		
		if(operate&&operate!='='){
			if(operate.indexOf('like')<0){
				if(operate=='<'){
				operate='$lt';
				}else if(operate=='<='){
					operate='$lte';
				}else if(operate=='>'){
					operate='$gt';
				}else if(operate=='>='){
					operate='$gte';
				}else if(operate=='in'){
					operate='$in';
				}else if(operate=='notin'){
					operate='$nin';
				}else if(operate=='!='||operate=='<>'){
					operate='$ne';
				}
				
				var q={};
				if(query[field]){
					q=query[field];
				}
				q[operate]=value;
				query[field]=q;
			}else{
				if(operate=='like'){
					query[field]=new RegExp(value,"i");
				}else if(operate=='%like'){
					query[field]=new RegExp(value+"$","i");
				}else if(operate=='like%'){
					query[field]=new RegExp("^"+value,"i");
				}
			}
			
		}else{
			query[field]=value;
		}
	},
	analysisSort:function(sortObject,sort){
		var field=sortObject.field;
		var isDesc=sortObject.isDesc;
		if(isDesc){
			if(isDesc=='true'){
				isDesc=true;
			}else if(isDesc=='false'){
				isDesc=false;
			}
		}else{
			isDesc=false;
		}
		sort[field]=isDesc?-1:1;
	},
	gainQueryAndSortByReq:function(req,query,sort){
		var self=this;
		if(req.query.conditions||(req.body&&req.body.conditions)){
		   var conditions=req.query.conditions;
		   if(!conditions){
			   conditions=req.body.conditions;
		   }
		   conditions=JSON.parse(conditions);
		   if(conditions instanceof Array){
			   
		   }else{
			   conditions=[conditions];
		   }
		   for(var cI=0;cI<conditions.length;cI++){
		        var condition=conditions[cI];
				if(condition.type=='simple'){
					self.analysisCondition(condition,query);
				}else if(condition.type=='or'){
				    var orConditionArray=[];
					var orConditions=condition.conditions;
					for(var orI=0;orI<orConditions.length;orI++){
					    var orCondition=orConditions[orI];
						var orQuery={};
						if(orCondition instanceof Array){
					        
						}else{
							orCondition=[orCondition];
						}
						for(var orII=0;orII<orCondition.length;orII++){
							var orConditionChild=orCondition[orII];
							self.analysisCondition(orConditionChild,orQuery);
						}
						orConditionArray.push(orQuery);	
					}
					query['$or']=orConditionArray;
				}
		   }
	    }
		
		if(req.query.sorts||(req.body&&req.body.sorts)){
		    var sorts=req.query.sorts;
			if(!sorts){
				sorts=req.body.sorts
			}
			sorts=JSON.parse(sorts);
		    if(sorts instanceof Array){
			   
		    }else{
			    sorts=[sorts];
		    }
			for(var sI=0;sI<sorts.length;sI++){
				var s=sorts[sI];
				self.analysisSort(s,sort);
		    }  
	    }
	},
	query:function(req,res,query,sort,pageNo,pageSize){
		var self=this;
		self.dao.list(query,null,sort,pageNo,pageSize,function(docs){
			if(!pageNo){
			    res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(docs);
				res.end(str);
			}else{
				self.dao.total(query,function(count){
					res.writeHead(200, {"Content-Type": "text/html"});
					var returnValue={};
					returnValue.total=count;
					returnValue.pageNo=pageNo;
					returnValue.pageSize=pageSize;
					returnValue.data=docs;
					var str = JSON.stringify(returnValue);
					res.end(str);
				});
			}
		});
	},
	list:function(req,res){
		var self=this;
		
		var query={};
	    
	    var pageSize=10;
		var pageNo;
	    if(req.query.page||(req.body&&req.body.page)){
			var page=req.query.page;
			if(!page){
				page=req.body.page;
			}
			page=JSON.parse(page);
			pageNo=parseInt(page.pageNo);
			if(pageNo<=0){
				pageNo=1;
			}
			if(page.pageSize)
		    pageSize=parseInt(page.pageSize);
	    }
		
	    var sort={};
	    self.gainQueryAndSortByReq(req,query,sort);

	    self.query(req,res,query,sort,pageNo,pageSize);
	},
    preInsert:function(req,res,doc,callback){
        callback(doc);
    },
    suffixInsert:function(req,res,doc,callback){
        callback(doc);
    },
    insert:function(req,res){
		var self=this;
		var doc=req.body;
		self.preInsert(req,res,doc,function(doc){

			self.dao.insert(doc,null,function(result){
				self.suffixInsert(req,res,result,function(result){
				    res.writeHead(200, {"Content-Type": "text/html"});
					var returnValue={status:"success",id:result.id};
					var str = JSON.stringify(returnValue);
					res.end(str);
				});
				
			});
		});
	},
	preGetMsg:function(req,res,id,callback){
        callback(id);
    },
    suffixGetMsg:function(req,res,doc,callback){
        callback(doc);
    },
    getMsg: function (req,res) {
      var self=this;
        var id=req.param('id');
        self.preGetMsg(req,res,id,function(id){
            self.dao.get(id,function(doc){
                self.suffixGetMsg(req,res,doc,function(doc){
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(doc);
                    res.end(str);
                });

            });
        });
    },
	preGet:function(req,res,id,callback){
		callback(id);
	},
	suffixGet:function(req,res,doc,callback){
		callback(doc);
	},
    get:function(req,res){
		var self=this;
		var id=req.param('id');
        self.preGet(req,res,id,function(id){
			self.dao.get(id,function(doc){
				self.suffixGet(req,res,doc,function(doc){
				    res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(doc);
					res.end(str);
				});
				
			});
		});
		
	},
    preUpdate:function(req,res,doc,callback){
		callback(doc);
	},
	suffixUpdate:function(req,res,doc,callback){
		callback(doc);
	},
    updateRole:function(req,res){
        var self=this;
        var id=req.param('id');
        var doc=req.body;

        if(doc.os!=undefined){
        self.dao.findOne({'id':id,'os.id':doc.os.id}, function (doc1) {
       if(doc1!=null){
            self.dao.updateArray({"id":id,'os.id':doc.os.id},{'$set':{'role':doc.role}},
                function(result){
                self.suffixUpdate(req,res,result,function(result){
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var returnValue={status:"success",id:id};//console.log('1');
                    var str = JSON.stringify(returnValue);
                    res.end(str);
                })
            });
       }else{
           self.preUpdate(req,res,doc, function (doc) {
               self.dao.insert(doc, function (result) {
                   self.suffixUpdate(req,res,result,function(result){
                        res.writeHead(200, {"Content-Type": "text/html"});
                       var returnValue={status:"success",id:id};
                       var str = JSON.stringify(returnValue);//console.log('2');
                        res.end(str);
                   })
               })
           })
       }
        });
        }else{
           self.dao.findOne({'id':id,role:{'$elemMatch':{'NO':doc.NO}}}, function (doc1) {
               if(doc1!=undefined){
                   res.writeHead(200, {"Content-Type": "text/html"});
                   var returnValue={status:"fail",msg:'编号已存在'};
                   var str = JSON.stringify(returnValue);//console.log(str);
                    res.end(str);
               }else{
                   self.dao.updateArray({id:id},{'$push':{role:doc}}, function (result) {
                       res.writeHead(200, {"Content-Type": "text/html"});
                       var returnValue={status:"success",id:id};
                       var str = JSON.stringify(returnValue);//console.log('3');
                       res.end(str);
                   })
               }

           })
        }
    },
    update:function(req,res){
        var self=this;
    	var id=req.param('id');
		var doc= req.body;
        doc.id=id;
		self.preUpdate(req,res,doc, function (doc1) {
			self.dao.update(doc1,function(result){
				self.suffixUpdate(req,res,result,function(result){
					res.writeHead(200, {"Content-Type": "text/html"});
					var returnValue={status:"success",id:id};
					var str = JSON.stringify(returnValue);
					res.end(str);
				})
			});
		})
	},

	preDelete:function(req,res,id,callback){
		callback(id);
	},
	suffixDelete:function(req,res,doc,callback){
		callback(doc);
	},
	'delete':function(req,res){
		var self=this;
		var id=req.param('id');
        self.preDelete(req,res,id,function(id){
			self.dao.delete(id,function(result){
				self.suffixDelete(req,res,result,function(result){
					res.writeHead(200, {"Content-Type": "text/html"});
					var returnValue={status:"success",id:result.id};
					var str = JSON.stringify(returnValue);
					res.end(str);
				});
				
			});
		});
		
	}

});