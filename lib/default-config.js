'use strict';

var _ = require('../lodash');
var util = require('./util');

var cache = new _.memoize.Cache;

module.exports = {

  /**
   * Logs `value` if it hasn't been logged before.
   *
   * @param {*} value The value to log.
   */
  'log': function log(value) {
    if (!cache.has(value)) {
      cache.set(value, true);
      console.log(value);
    }
  },

  /**
   * Generates the migrate warning message as a string.
   *
   * @param {Object} data Migrate message data.
   */
  'migrateMessage': function(invocation){
    invocation.args = util.truncate(
      util.inspect(invocation.args)
      .match(/^\[\s*([\s\S]*?)\s*\]$/)[1]
      .replace(/\n */g, ' ')
    );
    invocation.oldResult = util.truncate(util.inspect(invocation.oldResult));
    invocation.newResult = util.truncate(util.inspect(invocation.newResult));

    return _.template([
      'lodash-migrate: _.<%= name %>(<%= args %>)',
      '  v<%= oldVersion %> => <%= oldResult %>',
      '  v<%= newVersion %> => <%= newResult %>',
      ''
    ].join('\n'))(invocation);
  },

  /**
   * Generates the rename warning message as a string.
   *
   * @param {Object} data Rename message data.
   */
  'renameMessage': _.template([
    'lodash-migrate: Method renamed',
    '  v<%= oldVersion %> => _.<%= oldName %>',
    '  v<%= newVersion %> => _.<%= newName %>',
    ''
  ].join('\n'))
};
