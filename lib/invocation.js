'use strict';

var _ = require('../lodash');
var config = require('./default-config');
var util = require('./util');

/*----------------------------------------------------------------------------*/

module.exports = Invocation;

/*----------------------------------------------------------------------------*/

/**
 * Represents an invocation of a lodash function (with results) that may be
 * invoked once per lodash version.
 *
 * The invocation(s) occur on instantiation so that results are available
 * immediately as a property on the instance.
 *
 * @param {Method} method The Method instance to invoke
 * @param {Array} args The arguments to apply
 * @param {*} context The `this` binding of the invocation
 */
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

/**
 * Logs a warning if the results differ (and the particular lodash
 * function's results can be compared
 */
Invocation.prototype.warnDifferences = function() {
  if (!this.method.ignoreDifferences && this.resultsDiffer()) {
    config.log(config.migrateMessage(this.forDisplay()));
  }
};

/**
 * Determines if the results differ between versions of lodash.
 *
 * @private
 */
Invocation.prototype.resultsDiffer = function() {
  return util.isComparable(this.oldResult)
    ? !util.isEqual(this.oldResult, this.newResult)
    : util.isComparable(this.newResult);
};

/**
 * Generates a plain object with necessary attributes intended for rendering
 * the log message template
 *
 * @private
 */
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
