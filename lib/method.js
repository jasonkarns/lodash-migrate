'use strict';

var _ = require('../lodash');
var mapping = require('./mapping');
var listing = require('./listing');
var reHasReturn = /\breturn\b/;

/*----------------------------------------------------------------------------*/

module.exports = Method;

/*----------------------------------------------------------------------------*/

/**
 * Represents a function to be tested between versions of lodash.
 *
 * @param {string} name The function name.
 */
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

/**
 * Sets up the method prototype with the two versions of lodash to be compared.
 *
 * @param {object} oldDash The old instance of lodash.
 * @param {object} newDash The new instance of lodash.
 */
Method.compare = function(oldDash, newDash) {
  this.prototype.oldDash = oldDash;
  this.prototype.newDash = newDash;
  this.prototype.oldVersion = oldDash.VERSION;
  this.prototype.newVersion = newDash.VERSION;
};

/**
 * This function needs a better name and documentation.
 * I don't fully understand its purpose.
 * @param {function} iteratee
 */
Method.prototype.needsIdentity = function(iteratee) {
  var isIteration = mapping.iteration[this.name];
  return isIteration &&
    !(isIteration.mappable && reHasReturn.test(iteratee));
};

/**
 * Determines if this method was renamed and if a warning should be generated.
 * If so, it invokes the 'warn' callback.
 *
 * @param {function} warn Callback function responsible for rendering and
 * logging the warning. Given an object with necessary properties for
 * generating the warning message.
 */
Method.prototype.warnRename = function(warn) {
  if (this.wasRenamed && !this.ignoreRename) {
    warn(this);
  }
};
