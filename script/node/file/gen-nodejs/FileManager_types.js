//
// Autogenerated by Thrift Compiler (0.9.1)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
var Thrift = require('thrift').Thrift;

var ttypes = module.exports = {};
File = module.exports.File = function(args) {
  this.id = null;
  this.name = null;
  this.type = null;
  this.url = null;
  this.imageUrl = null;
  this.parentId = null;
  this.classify = null;
  this.mainId = null;
  this.format = null;
  this.size = null;
  if (args) {
    if (args.id !== undefined) {
      this.id = args.id;
    }
    if (args.name !== undefined) {
      this.name = args.name;
    }
    if (args.type !== undefined) {
      this.type = args.type;
    }
    if (args.url !== undefined) {
      this.url = args.url;
    }
    if (args.imageUrl !== undefined) {
      this.imageUrl = args.imageUrl;
    }
    if (args.parentId !== undefined) {
      this.parentId = args.parentId;
    }
    if (args.classify !== undefined) {
      this.classify = args.classify;
    }
    if (args.mainId !== undefined) {
      this.mainId = args.mainId;
    }
    if (args.format !== undefined) {
      this.format = args.format;
    }
    if (args.size !== undefined) {
      this.size = args.size;
    }
  }
};
File.prototype = {};
File.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.id = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.type = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.url = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.imageUrl = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRING) {
        this.parentId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRING) {
        this.classify = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.STRING) {
        this.mainId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.STRING) {
        this.format = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.I64) {
        this.size = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

File.prototype.write = function(output) {
  output.writeStructBegin('File');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 2);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.type !== null && this.type !== undefined) {
    output.writeFieldBegin('type', Thrift.Type.STRING, 3);
    output.writeString(this.type);
    output.writeFieldEnd();
  }
  if (this.url !== null && this.url !== undefined) {
    output.writeFieldBegin('url', Thrift.Type.STRING, 4);
    output.writeString(this.url);
    output.writeFieldEnd();
  }
  if (this.imageUrl !== null && this.imageUrl !== undefined) {
    output.writeFieldBegin('imageUrl', Thrift.Type.STRING, 5);
    output.writeString(this.imageUrl);
    output.writeFieldEnd();
  }
  if (this.parentId !== null && this.parentId !== undefined) {
    output.writeFieldBegin('parentId', Thrift.Type.STRING, 6);
    output.writeString(this.parentId);
    output.writeFieldEnd();
  }
  if (this.classify !== null && this.classify !== undefined) {
    output.writeFieldBegin('classify', Thrift.Type.STRING, 7);
    output.writeString(this.classify);
    output.writeFieldEnd();
  }
  if (this.mainId !== null && this.mainId !== undefined) {
    output.writeFieldBegin('mainId', Thrift.Type.STRING, 8);
    output.writeString(this.mainId);
    output.writeFieldEnd();
  }
  if (this.format !== null && this.format !== undefined) {
    output.writeFieldBegin('format', Thrift.Type.STRING, 9);
    output.writeString(this.format);
    output.writeFieldEnd();
  }
  if (this.size !== null && this.size !== undefined) {
    output.writeFieldBegin('size', Thrift.Type.I64, 10);
    output.writeI64(this.size);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

