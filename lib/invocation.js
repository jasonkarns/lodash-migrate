'use strict';

var _ = require('../lodash');
var config = require('./default-config');
var util = require('./util');

/*----------------------------------------------------------------------------*/

module.exports = Invocation;

function Invocation(method, args, context) {
  this.method = method;
  this.args = args;

  if (this.method.ignoreDifferences) {
    this.oldResult = method.oldFunc.apply(context, args);
  } else {
    var argsClone = util.cloneDeep(args);

    if (this.method.needsIdentity(argsClone[1])) {
      argsClone[1] = _.identity;
    }

    this.oldResult = method.oldFunc.apply(context, args);
    this.newResult = _.attempt(function() { return method.newFunc.apply(context, argsClone); });
  }
}

Invocation.prototype.warnDifferences = function() {
  if (!this.method.ignoreDifferences && this.resultsDiffer()) {
    config.log(config.migrateMessage(this.forDisplay()));
  }
};

Invocation.prototype.resultsDiffer = function() {
  return util.isComparable(this.oldResult)
    ? !util.isEqual(this.oldResult, this.newResult)
    : util.isComparable(this.newResult);
};

Invocation.prototype.forDisplay = function() {
  return _.merge({}, this.method, {
    args: util.truncate(
      util.inspect(this.args)
      .match(/^\[\s*([\s\S]*?)\s*\]$/)[1]
      .replace(/\n */g, ' ')
    ),
    oldResult: util.truncate(util.inspect(this.oldResult)),
    newResult: util.truncate(util.inspect(this.newResult))
  });
};
