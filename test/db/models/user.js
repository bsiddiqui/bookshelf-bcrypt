'use strict'

const db = require('../')

module.exports = db.bookshelf.model('User', {
  tableName: 'users',
  bcrypt: { field: 'password' }
})
