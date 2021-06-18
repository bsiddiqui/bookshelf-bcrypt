'use strict'

const path = require('path')

exports.development = {
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'db.sqlite')
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations')
  },
  seeds: {
    directory: path.join(__dirname, 'seeds')
  }
}
