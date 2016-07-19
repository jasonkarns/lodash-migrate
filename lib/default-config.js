'use strict';

var _ = require('../lodash');
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
  'migrateMessage': _.template([
    'lodash-migrate: _.<%= name %>(<%= args %>)',
    '  v<%= oldData.version %> => <%= oldData.result %>',
    '  v<%= newData.version %> => <%= newData.result %>',
    ''
  ].join('\n')),

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