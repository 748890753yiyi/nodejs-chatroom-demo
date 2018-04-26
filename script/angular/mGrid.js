var resource;
var restfulUrl;
var page;
var conditions;
var sorts;
var pageNumber;
var queryCondition = [];
var isLoading = false;
var grid = function (resource, restfulUrl, page, conditions, sorts) {
    this.resource = resource;
    this.restfulUrl = restfulUrl;
    if (page) {
        this.page = page;
    } else {
        this.page = {};
    }
    if (conditions) {
        this.conditions = conditions;
    } else {
        this.conditions = [];
    }
    if (sorts) {
        this.sorts = sorts;
    } else {
        this.sorts = [];
    }
    this.restful = this.resource.extend(this.restfulUrl);
};
grid.prototype.query = function (conditions, callback) {
    var self = this;
    if (conditions) {
        conditions.forEach(function (item) {
            self.conditions.push(item);
        });
    } else {
        conditions = [];
    }
    overlayerStart();
    if (self.pageNumber) {
        if (self.page.pageNo > self.pageNumber) {
            self.page.pageNo = self.pageNumber
        }
    }
    var pageStr = JSON.stringify(this.page);
    var conditionsStr = JSON.stringify(self.conditions);
    var sortsStr = JSON.stringify(this.sorts);

    self.restful.query({'page': pageStr, 'conditions': conditionsStr, 'sorts': sortsStr}, function (datas) {
        if (datas.status == 'success') {
            /* datas.data.forEach(function(item){
             item.checked=false;
             }); */
            self.datas = datas;
            self.pageNumber = parseInt(datas.total / self.page.pageSize);
            if (datas.total % self.page.pageSize != 0) {
                self.pageNumber++;
            }
            if (self.pageNumber == 0) {
                self.pageNumber = 1;
            }
            callback(self);
            overlayerEnd();
        }
    });
};
grid.prototype.firstPage = function (callback) {
    if (this.page.pageNo != 1) {
        this.page.pageNo = 1;
        this.query(queryCondition, callback);
    }
};
grid.prototype.prePage = function (callback) {
    if (this.page.pageNo > 1) {
        this.page.pageNo--;
        this.query(queryCondition, callback);
    }
};
grid.prototype.nextPage = function (callback) {
    if (this.page.pageNo < this.pageNumber) {
        this.page.pageNo++;
        this.query(queryCondition, callback);
    }
};
grid.prototype.lastPage = function (callback) {
    if (this.page.pageNo != this.pageNumber) {
        this.page.pageNo = this.pageNumber;
        this.query(queryCondition, callback);
    }
};
grid.prototype.selectPage = function (page, callback) {
    this.page = page;
    this.query(queryCondition, callback);
};

/* 针对组，参数平级 conditions 传  */
var levelGrid = function (resource, restfulUrl, conditions) {
    this.resource = resource;
    this.restfulUrl = restfulUrl;
    if (conditions) {
        this.conditions = conditions;
    } else {
        this.conditions = {};
    }
    this.restful = this.resource.extend(this.restfulUrl);
};
levelGrid.prototype.query = function (conditions, callback) {
    var self = this;
    if (self.pageNumber) {
        if (self.conditions.pageNo > self.pageNumber) {
            self.conditions.pageNo = self.pageNumber
        }
    }
    overlayerStart();
    self.restful.query(self.conditions, function (datas) {
        self.datas = datas;
        self.pageNumber = parseInt(datas.total / self.conditions.pageSize);
        if (datas.total % self.conditions.pageSize != 0) {
            self.pageNumber++;
        }
        if (self.pageNumber == 0) {
            self.pageNumber = 1;
        }
        callback(self);
        overlayerEnd();
    });
};

levelGrid.prototype.firstPage = function (callback) {
    if (this.conditions.pageNo != 1) {
        this.conditions.pageNo = 1;
        this.query([], callback);
    }
};
levelGrid.prototype.prePage = function (callback) {
    if (this.conditions.pageNo > 1) {
        this.conditions.pageNo--;
        this.query([], callback);
    }
};
levelGrid.prototype.nextPage = function (callback) {
    if (this.conditions.pageNo < this.pageNumber) {
        this.conditions.pageNo++;
        this.query([], callback);
    }
};
levelGrid.prototype.lastPage = function (callback) {
    if (this.conditions.pageNo != this.pageNumber) {
        this.conditions.pageNo = this.pageNumber;
        this.query([], callback);
    }
};
levelGrid.prototype.selectPage = function (conditions, callback) {
    this.conditions = conditions;
    this.query([], callback);
};


//记录多页的
var multiGetGrid = function (resource, restfulUrl, conditions, scope, listName) {
    this.resource = resource;
    this.restfulUrl = restfulUrl;
    if (conditions) {
        this.conditions = conditions;
    } else {
        this.conditions = {};
    }
    // this.restful=this.resource.extend(this.restfulUrl);
    // this.conditions.xxx = (Math.random()+1)*(Math.random()+1);
    if (scope && listName) {
        this.scope = scope;
        this.listName = listName;
        this.scope[this.listName] = [];
    }
    this.restful = this.resource.extend(this.restfulUrl);
};
extend(multiGetGrid, grid);

multiGetGrid.prototype.query = function (conditions, callback) {
    var self = this;
    if (self.pageNumber) {
        if (self.conditions.pageNo > self.pageNumber) {
            self.conditions.pageNo = self.pageNumber
        }
    }
    if (self.conditions.pageNo == 1) {
        overlayerStart();
    }
    self.restful.query(self.conditions, function (datas) {
        var selected = [];

        if (self.scope[self.listName]) {
            selected = self.scope[self.listName];
        }

        datas.list.forEach(function (item) {
            item.checked = false;
            selected.forEach(function (it) {
                if (it.id == item.id) {
                    item.checked = true;
                }
            });
        });

        self.datas = datas;
        self.pageNumber = parseInt(datas.total / self.conditions.pageSize);
        if (datas.total % self.conditions.pageSize != 0) {
            self.pageNumber++;
        }
        if (self.pageNumber == 0) {
            self.pageNumber = 1;
        }
        callback(self);
        overlayerEnd();
    });
};

multiGetGrid.prototype.prePage = function (callback) {
    if (this.conditions.pageNo > 1) {
        this.conditions.pageNo--;
        this.query([], callback);
    }
};
multiGetGrid.prototype.nextPage = function (callback) {
    if (this.conditions.pageNo < this.pageNumber) {
        this.conditions.pageNo++;
        this.query([], callback);
    }
};

// 选择或取消选择一项
multiGetGrid.prototype.checkNode = function (selectNode, callback) {
    var inList = false;
    for (var i = 0; i < this.scope[this.listName].length; i++) {
        var node = this.scope[this.listName][i];
        if (selectNode.id == node.id) {
            inList = true;
            if (selectNode.checked == true) {
                this.scope[this.listName].splice(i, 1);
                callback(selectNode, false);
                return;
            }
        }
    }
    if (!inList) {
        if (selectNode.checked == false) {
            this.scope[this.listName].push(selectNode);
            callback(selectNode, true);
        }
    }
};
// 全选
multiGetGrid.prototype.selectAll = function (nodes, isChecked, callback) {
    var newNodes = [];
    for (var i = 0; i < nodes.length; i++) {
        var selectNode = nodes[i];
        var inList = false;
        for (var j = 0; j < this.scope[this.listName].length; j++) {
            var node = this.scope[this.listName][j];
            if (selectNode.id == node.id) {
                inList = true;
                if (!isChecked) {
                    this.scope[this.listName].splice(j, 1);
                    nodes[i].checked = false;
                    newNodes.push(selectNode);	// 记录取消的
                }
            }
        }
        if (!inList && isChecked) {
            this.scope[this.listName].push(selectNode);
            nodes[i].checked = true;
            newNodes.push(selectNode);	//记录添加的
        }
    }
    callback(nodes, isChecked, nodes, newNodes);
};

multiGetGrid.prototype.isSelectAll = function (nodes) {
    /* 查找未选标记 */
    var isAll = true;
    for (var i = 0; i < nodes.length; i++) {
        var item = nodes[i];
        var isInit = false;
        for (var j = 0; j < this.scope[this.listName].length; j++) {
            var item1 = this.scope[this.listName][j];
            if (item.id == item1.id) {
                isInit = true;
            }
        }
        if (!isInit) {
            isAll = false;
            break;
        }
    }
    return isAll;
    /* 记录已选个数比较 */
    /*var selectCount=0;
     this.scope[this.listName].forEach(function(item){
     nodes.forEach(function(item1){
     if(item.id==item1.id){
     selectCount++;
     }
     })
     })
     return selectCount==nodes.length;*/
};
multiGetGrid.prototype.getSeletedId = function (/* callback */) {
    var selectIds = [];
    this.scope[this.listName].forEach(function (item) {
        selectIds.push(item.id);
    });
    return selectIds;
    // callback(selectIds);
};

//记录多页的(后台管理)
var multiGrid = function (resource, restfulUrl, page, conditions, sorts, scope, listName) {
    this.resource = resource;
    this.restfulUrl = restfulUrl;
    if (page) {
        this.page = page;
    } else {
        this.page = {};
    }
    if (conditions) {
        this.conditions = conditions;
    } else {
        this.conditions = {};
    }
    if (sorts) {
        this.sorts = sorts;
    } else {
        this.sorts = [];
    }
    // this.restful=this.resource.extend(this.restfulUrl);

    if (scope && listName) {
        this.scope = scope;
        this.listName = listName;
        this.scope[this.listName] = [];
    }
    this.restful = this.resource.extend(this.restfulUrl);
};
extend(multiGrid, multiGetGrid);

multiGrid.prototype.query = function (conditions, callback) {
    var self = this;
    if (conditions) {
        conditions.forEach(function (item) {
            self.conditions.push(item);
        });
    } else {
        conditions = [];
    }
    if (self.pageNumber) {
        if (self.page.pageNo > self.pageNumber) {
            self.page.pageNo = self.pageNumber
        }
    }
    if (self.page.pageNo == 1) {
        overlayerStart();
    }
    var pageStr = JSON.stringify(this.page);
    var conditionsStr = JSON.stringify(self.conditions);
    var sortsStr = JSON.stringify(this.sorts);

    self.restful.query({'page': pageStr, 'conditions': conditionsStr, 'sorts': sortsStr}, function (datas) {
        if (datas.status == 'success') {
            /* datas.data.forEach(function(item){
             item.checked=false;
             }); */
            self.datas = datas;
            self.pageNumber = parseInt(datas.total / self.page.pageSize);
            if (datas.total % self.page.pageSize != 0) {
                self.pageNumber++;
            }
            if (self.pageNumber == 0) {
                self.pageNumber = 1;
            }
            callback(self);
            overlayerEnd();
        }
    });
};