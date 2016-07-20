'use strict';

var _ = require('../lodash');
var config = require('./default-config');
var mapping = require('./mapping');
var listing = require('./listing');
var reHasReturn = /\breturn\b/;

/*----------------------------------------------------------------------------*/

module.exports = Method;

function Method(name) {
  this.name = name;
  this.oldName = name;
  this.newName = mapping.rename[name] || name;

  var isSeqFunc = _.includes(listing.seqFuncs, name);
  this.oldFunc = isSeqFunc ? this.oldDash.prototype[name] : this.oldDash[name];
  this.newFunc = isSeqFunc ? this.newDash.prototype[this.newName] : this.newDash[this.newName];

  this.wasRenamed = mapping.rename[name];
  this.ignoreRename = _.includes(listing.ignored.rename, name);

  this.ignoreDifferences = _.includes(listing.ignored.result, name);
}

Method.compare = function(oldDash, newDash) {
  this.prototype.oldDash = oldDash;
  this.prototype.newDash = newDash;
  this.prototype.oldVersion = oldDash.VERSION;
  this.prototype.newVersion = newDash.VERSION;
};

Method.prototype.needsIdentity = function(callback) {
  var isIteration = mapping.iteration[this.name];
  return isIteration &&
    !(isIteration.mappable && reHasReturn.test(callback));
};

Method.prototype.warnRename = function() {
  if (this.wasRenamed && !this.ignoreRename) {
    config.log(config.renameMessage(this));
  }
};
