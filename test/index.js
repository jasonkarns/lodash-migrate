'use strict';

var configure = require('../index');

var _ = require('../lodash'),
  old = require('lodash'),
  mapping = require('../lib/mapping'),
  QUnit = require('qunit-extras'),
  util = require('../lib/util');

var defaultConfig = require('../lib/default-config');

var renames = [], migrations = [];

/*----------------------------------------------------------------------------*/

QUnit.assert.noWarnings = function(){
  this.noRenames();
  this.noMigrations();
};

QUnit.assert.noRenames = function(){
  this.pushResult({
    result: _.isEmpty(renames),
    message: 'Unexpected Renames: ' + renames
  });
};

QUnit.assert.noMigrations = function(){
  this.pushResult({
    result: _.isEmpty(migrations),
    message: 'Unexpected Migrations: ' + migrations
  });
};

QUnit.assert.rename = function(oldName){
  var expected = oldName + ' → ' + mapping.rename[oldName];

  this.pushResult({
    result: _.isEqual(renames, [expected]),
    actual: renames,
    expected: expected,
    message: 'RENAME'
  });
};

QUnit.assert.migration = function(name){
  this.pushResult({
    result: _.isEqual(migrations, [name]),
    actual: migrations,
    expected: name,
    message: 'MIGRATION'
  });
};

/*----------------------------------------------------------------------------*/


QUnit.begin(function() {
  configure({
    // mute the console output
    log: _.noop,

    // store renames for asserting
    renameMessage: function(rename){
      renames.push(rename.oldName + ' → ' + rename.newName);
    },

    // store migrations for asserting
    migrateMessage: function(migration){
      migrations.push(migration.name);
    }
  });
});

QUnit.testStart(function() {
  renames.length = 0;
  migrations.length = 0;
});


QUnit.module('lodash-migrate');

/*----------------------------------------------------------------------------*/

QUnit.module('iteration method');

QUnit.test('should not invoke `iteratee` in new lodash', function(assert) {
  assert.expect(8);

  var count,
    array = [1],
    object = { 'a': 1 },
    iteratee = function() { count++; };

  _.each(['each', 'eachRight', 'forEach', 'forEachRight'], function(methodName) {
    count = 0;
    old[methodName](array, iteratee);
    assert.strictEqual(count, 1, methodName);
  });

  _.each(['forIn', 'forInRight', 'forOwn', 'forOwnRight'], function(methodName) {
    count = 0;
    old[methodName](object, iteratee);
    assert.strictEqual(count, 1, methodName);
  });
});

/*----------------------------------------------------------------------------*/

QUnit.module('missing methods');

QUnit.test('should not error on legacy `_.callback` use', function(assert) {
  old.callback('x');
  assert.noWarnings();
});

QUnit.test('should not error on legacy `_.contains` use', function(assert) {
  old([1, 2, 3]).contains(2);

  assert.rename('contains');
  assert.noMigrations();
});

QUnit.test('should not error on legacy `_.indexBy` use', function(assert) {
  old({ 'a': 'x' }).indexBy(_.identity).value();

  // TODO assert.rename('indexBy');
  assert.noMigrations();
});

QUnit.test('should not error on legacy `_#run` use', function(assert) {
  old(1).run();

  assert.rename('run');
  assert.noMigrations();
});

QUnit.test('should not error on legacy `_.trunc` use', function(assert) {
  old('abcdef').trunc(3);

  assert.rename('trunc');
  assert.migration('trunc');
});

/*----------------------------------------------------------------------------*/

QUnit.module('mutator methods');

QUnit.test('should clone arguments before invoking methods', function(assert) {
  var array = [1, 2, 3];

  old.remove(array, function(value, index) {
    return index == 0;
  });

  assert.deepEqual(array, [2, 3]);
});

QUnit.test('should not double up on value mutations', function(assert) {
  var array = [1, 2, 3],
    lastIndex = 0;

  old.remove(array, function(value, index) {
    if (lastIndex > index) {
      return true;
    }
    lastIndex = index;
  });

  assert.deepEqual(array, [1, 2, 3]);
});

/*----------------------------------------------------------------------------*/

QUnit.module('old.defer');

QUnit.test('should not log', function(assert) {
  old.defer(_.identity);
  assert.noWarnings();
});

/*----------------------------------------------------------------------------*/

QUnit.module('old.delay');

QUnit.test('should not log', function(assert) {
  old.delay(_.identity, 1);
  assert.noWarnings();
});

/*----------------------------------------------------------------------------*/

QUnit.module('old.mixin');

QUnit.test('should not log', function(assert) {
  old.mixin();
  assert.noWarnings();
});

/*----------------------------------------------------------------------------*/

QUnit.module('old.now');

QUnit.test('should not log', function(assert) {
  old.now();
  assert.noWarnings();
});

/*----------------------------------------------------------------------------*/

QUnit.module('old.runInContext');

QUnit.test('should accept a `context` argument', function(assert) {
  var count = 0;

  var now = function() {
    count++;
    return Date.now();
  };

  var lodash = old.runInContext({
    'Date': function() {
      return { 'getTime': now };
    }
  });

  lodash.now();
  assert.strictEqual(count, 1);
});

QUnit.test('should not log', function(assert) {
  old.runInContext();
  assert.noWarnings();
});

QUnit.test('should wrap results', function(assert) {
  var lodash = old.runInContext(),
    objects = [{ 'a': 1 }, { 'a': 2 }, { 'a': 3 }];

  lodash.max(objects, 'a');
  // assert.strictEqual(_.last(logs), expected);
  assert.migration('max');
});

/*----------------------------------------------------------------------------*/

QUnit.module('old.sample');

QUnit.test('should work when chaining', function(assert) {
  var array = [1],
    wrapped = old(array);

  assert.strictEqual(wrapped.sample(), 1);
  assert.deepEqual(wrapped.sample(1).value(), [1]);
});

/*----------------------------------------------------------------------------*/

QUnit.module('old.times');

QUnit.test('should only invoke `iteratee` in new lodash when it contains a `return` statement', function(assert) {
  var count= 0;
  old.times(1, function() { count++; });
  assert.strictEqual(count, 1);

  count = 0;
  old.times(1, function() { count++; return; });
  assert.strictEqual(count, 2);
});

/*----------------------------------------------------------------------------*/

QUnit.module('old.uniqueId');

QUnit.test('should not log', function(assert) {
  old.uniqueId();
  assert.noWarnings();
});

/*----------------------------------------------------------------------------*/

QUnit.module('old#valueOf');

QUnit.test('should not log', function(assert) {
  old([1]).valueOf();
  assert.noWarnings();
});

/*----------------------------------------------------------------------------*/

QUnit.module('logging');

(function() {
  function Foo(key) {
    this[key] = function() {};
  }
  Foo.prototype.$ = function() {};

  QUnit.test('should log when using unsupported static API', function(assert) {
    old.max([{ 'b': 1 }, { 'b': 2 }, { 'b': 3 }], 'b');
    assert.migration('max');
  });

  QUnit.test('should not log when both lodashes produce uncomparable values', function(assert) {
    function Bar(a) { this.a = a; }
    var counter = 0;

    old.times(2, function() {
      return new Bar(counter++);
    });

    assert.noWarnings();

    old.curry(function(a, b, c) {
      return [a, b, c];
    });

    assert.noWarnings();
  });
}());

QUnit.module('default logging function', {
  before: function(){
    this.logs = [];
    this.original_write = process.stdout.write;

    process.stdout.write = function(message) {
      this.logs.push(message);
    }.bind(this);
  },
  after: function(){
    process.stdout.write = this.original_write;
  }
}, function(){
  var config = require('../lib/default-config');

  QUnit.test('should log a specific message only once', function(assert) {
    config.log('foo');
    config.log('bar');
    config.log('foo');

    assert.deepEqual(this.logs, ['foo\n', 'bar\n'])
  });
});

QUnit.module('default migration template', function(){
  var reColor = /\x1b\[\d+m/g;

  QUnit.test('should include ANSI escape codes', function(assert) {
    var config = require('../lib/default-config');

    assert.ok(reColor.test(config.migrateMessage({
      name: 'fake', args: [1,2,3],
      oldVersion: 'OLD', newVersion: 'NEW',
      oldResult: 'old results', newResult: 'new results'
    })));
  });

  QUnit.module('in browser', {
    beforeEach: function(){
      [ '../lib/default-config', '../lib/util' ].forEach(function clearRequireCache(id) {
        delete require.cache[require.resolve(id)];
      });

      global.document = {}; // pretend in browser
    },
    afterEach: function(){
      delete global.document;
    }
  }, function(){

    QUnit.test('should not include ANSI escape codes', function(assert) {
      var config = require('../lib/default-config');

      assert.notOk(reColor.test(config.migrateMessage({
        name: 'fake', args: [1,2,3],
        oldVersion: 'OLD', newVersion: 'NEW',
        oldResult: 'old results', newResult: 'new results'
      })));
    });
  });
});

/*----------------------------------------------------------------------------*/

QUnit.config.asyncRetries = 10;
QUnit.config.hidepassed = true;
QUnit.config.noglobals = true;

QUnit.load();
QUnit.start();
