# bookshelf-bcrypt
[![Build Status](https://circleci.com/gh/estate/bookshelf-bcrypt.svg?style=shield)](https://circleci.com/gh/estate/bookshelf-bcrypt)
[![Code Climate](https://codeclimate.com/github/estate/bookshelf-bcrypt/badges/gpa.svg)](https://codeclimate.com/github/estate/bookshelf-bcrypt)
[![Test Coverage](https://codeclimate.com/github/estate/bookshelf-bcrypt/badges/coverage.svg)](https://codeclimate.com/github/estate/bookshelf-bcrypt/coverage)
[![Version](https://badge.fury.io/js/bookshelf-bcrypt.svg)](http://badge.fury.io/js/bookshelf-bcrypt)
[![Downloads](http://img.shields.io/npm/dm/bookshelf-bcrypt.svg)](https://www.npmjs.com/package/bookshelf-bcrypt)

Automatic password hashing for your bookshelf models

### Installation

After installing `bookshelf-bcrypt` with `npm i --save bookshelf-bcrypt`,
all you need to do is add it as a bookshelf plugin and enable it on your models.

```javascript
let knex = require('knex')(require('./knexfile.js').development)
let bookshelf = require('bookshelf')(knex)

// Add the plugin
bookshelf.plugin(require('bookshelf-bcrypt'))

// Enable it on your models
let User = bookshelf.Model.extend({ tableName: 'users', bcrypt: { field: 'password' } })

// By default, an error will be thrown if a null/undefined password is detected. Use the following to allow null/undefined passwords
let User = bookshelf.Model.extend({ tableName: 'users', bcrypt: { field: 'password', allowEmptyPassword: true } })
```

### Usage

Nothing fancy here, just keep using bookshelf as usual.

```javascript
// Wow such h4x0r, much password
let user = yield User.forge({ password: 'h4x0r' }).save()
console.log(user.get('password')) // $2a$12$K2CtDP7zSGOKgjXjxD9SYey9mSZ9Udio9C95K6wCKZewSP9oBWyPO
```

This plugin will also hash the password again if it detects that the field
changed, so you're good to do this:

```javascript
let user = yield User.forge({ id: 1000 }).fetch()

// Update the user
user.set('password', 'another_pwd')
yield user.save() // Password automatically hashed with the new value

// You can also avoid hashing by using an options
yield user.save({ bcrypt: false })
```

### Settings

`bookshelf-bcrypt` uses 12 salt rounds by default and throws an error when it
detect a rehash of a bcrypt hash. You can change this behavior when adding
the plugin to bookshelf

```javascript
bookshelf.plugin(require('bookshelf-bcrypt'), {
  rounds: 10 // >= 12 recommended though,
  onRehash: function () {
    // This will avoid throwing error but be aware that you can loose
    // user's password if you don't know what you're doing.
    // The function is also binded to the model instance that raised the event
    // so you can use any method to better handle it
    console.warn(`Rehash detected for ${this.tableName}`)
    this.set('need_password_change', true)
  }
})
```

### Testing

```bash
git clone git@github.com:estate/bookshelf-bcrypt.git
cd bookshelf-bcrypt && npm install && npm test
```
