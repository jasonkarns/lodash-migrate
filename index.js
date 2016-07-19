'use strict';

var _ = require('./lodash'),
    old = require('lodash');

var listing = require('./lib/listing'),
    mapping = require('./lib/mapping'),
    util = require('./lib/util');

var config = _.clone(require('./lib/default-config')),
    reHasReturn = /\breturn\b/;

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
 * @param {Function} oldDash The old lodash function.
 * @param {Function} newDash The new lodash function.
 * @param {string} name The name of the lodash method to wrap.
 * @returns {Function} Returns the new wrapped method.
 */
function wrapMethod(name) {
  var method = new Method(name);

  return _.wrap(method.oldFunc, _.rest(function(oldFunc, args) {
    var that = this;
    var invocation = new Invocation(method, args, this);

    var data = {
      'name': name,
      'args': util.truncate(
        util.inspect(args)
          .match(/^\[\s*([\s\S]*?)\s*\]$/)[1]
          .replace(/\n */g, ' ')
      ),
      'oldData': {
        'name': name,
        'version': method.oldVersion
      },
      'newData': {
        'name': method.newName,
        'version': method.newVersion
      }
    };

    method.warnRename();

    if (method.ignoreDifferences) {
      return invocation.oldResults;
    }

    var argsClone = util.cloneDeep(args),
        isIteration = mapping.iteration[name];

    if (isIteration &&
        !(isIteration.mappable && reHasReturn.test(argsClone[1]))) {
      argsClone[1] = _.identity;
    }
    var oldResult = oldFunc.apply(that, args),
        newResult = _.attempt(function() { return method.newFunc.apply(that, argsClone); });

    if (util.isComparable(oldResult)
          ? !util.isEqual(oldResult, newResult)
          : util.isComparable(newResult)
        ) {
      config.log(config.migrateMessage(_.merge(data, {
        'oldData': { 'result': util.truncate(util.inspect(oldResult)) },
        'newData': { 'result': util.truncate(util.inspect(newResult)) }
      })));
    }
    return oldResult;
  }));
}

/*----------------------------------------------------------------------------*/

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

Method.prototype.warnRename = function() {
  if (this.wasRenamed && !this.ignoreRename) {
    config.log(config.renameMessage(this));
  }
};

function Invocation(method, args, context) {
  this.method = method;
  this.args = args;
  this.context = context;

  if (this.method.ignoreDifferences) {
    this.oldResults = this.method.oldFunc.apply(this.context, this.args);
  } else {
  }
}

wrapLodash(old, _);

module.exports = _.partial(_.assign, config);
