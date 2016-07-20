'use strict';

var _ = require('./lodash'),
    old = require('lodash');

var Method = require('./lib/method'),
    Invocation = require('./lib/invocation'),
    listing = require('./lib/listing');

var config = _.clone(require('./lib/default-config'));

/*----------------------------------------------------------------------------*/

/**
 * Wraps `oldDash` methods to compare results of `oldDash` and `newDash`.
 *
 * @private
 * @param {Function} oldDash The old lodash function.
 * @param {Function} newDash The new lodash function.
 * @returns {Function} Returns `oldDash`.
 */
function wrapLodash(oldDash, newDash) {
  var methodNames = _.functions(oldDash),
      unwrapped = listing.unwrapped,
      wrapped = _.difference(methodNames, unwrapped, listing.seqFuncs),
      oldRunInContext = oldDash.runInContext;

  Method.compare(oldDash, newDash);

  // Wrap methods.
  _.each([unwrapped, wrapped], function(names, index) {
    oldDash.mixin(_.transform(names, function(source, name) {
      source[name] = wrapMethod(name);
    }, {}), !!index);
  });

  // Wrap `_.runInContext.
  oldDash.runInContext = function(context) {
    return wrapLodash(oldRunInContext(context), newDash);
  };

  // Wrap `_#sample` which can return wrapped and unwrapped values.
  oldDash.prototype.sample = _.wrap(oldDash.sample, function(sample, n) {
    var chainAll = this.__chain__,
        result = sample(this.__wrapped__, n);

    if (chainAll || n != null) {
      result = oldDash(result);
      result.__chain__ = chainAll;
    }
    return result;
  });

  // Wrap chain sequence methods.
  _.each(listing.seqFuncs, function(name) {
    if (oldDash.prototype[name]) {
      oldDash.prototype[name] = wrapMethod(name);
    }
  });

  return oldDash;
}

/**
 * Creates a function that compares results of method `name` on `oldDash`
 * and `newDash` and logs a warning for unequal results.
 *
 * @private
 * @param {string} name The name of the lodash method to wrap.
 * @returns {Function} Returns the new wrapped method.
 */
function wrapMethod(name) {
  var method = new Method(name);

  return _.wrap(method.oldFunc, _.rest(function(oldFunc, args) {
    var invocation = new Invocation(method, args, this);

    method.warnRename(function(data) {
      config.log(config.renameMessage(data));
    });

    return _.tap(invocation.oldResult, function() {
      invocation.warnDifferences(function(data){
        config.log(config.migrateMessage(data));
      });
    });
  }));
}

/*----------------------------------------------------------------------------*/

wrapLodash(old, _);

module.exports = _.partial(_.assign, config);
