'use strict';

var _ = require('../lodash');
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
 * Determines if the results differ and if a warning should be generated.
 * If so, it invokes the `warn` callback.
 *
 * @param {function} warn Callback function responsible for rendering and
 * logging the warning. Given an object with necessary properties for
 * generating the warning message.
 */
Invocation.prototype.warnDifferences = function(warn) {
  if (!this.method.ignoreDifferences && this.resultsDiffer()) {
    warn(this.forDisplay());
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
  return _.merge({}, this.method, this);
};
