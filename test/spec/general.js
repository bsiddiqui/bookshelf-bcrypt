'use strict'

let co = require('co')
let lab = exports.lab = require('lab').script()
let expect = require('code').expect
let bcrypt = require('bcrypt')

let db = require('../db')
let User = db.bookshelf.model('User')

lab.experiment('general tests', () => {
  lab.beforeEach(co.wrap(function * () {
    yield db.reset()
    yield db.knex.seed.run()
  }))

  lab.test('should work', co.wrap(function * () {
    let user = yield User
      .forge({
        name: 'Hello World',
        email: 'hello@world.com',
        password: 'password'
      })
      .save()

    expect(user.get('password')).to.not.equal('password')
    expect(user.get('password').split('$')).to.have.length(4)
  }))

  lab.test('should not hash if field did not changed', co.wrap(function * () {
    let user = yield User.forge({ email: 'Raina_Kunde14@hotmail.com' })
    .fetch()
    .then((user) => user.save('email', 'hello@world'))

    expect(user.hasChanged('password')).to.be.false()
  }))

  lab.test('should compare', co.wrap(function * () {
    let user = yield User.forge({ email: 'Raina_Kunde14@hotmail.com' }).fetch()

    expect(yield user.compare('password')).to.be.true()
    expect(yield user.compare('pwd')).to.be.false()
  }))

  lab.test('should capture compare errors', co.wrap(function * () {
    let user = yield User.forge({ email: 'Raina_Kunde14@hotmail.com' }).fetch()
    let error = yield user.compare().catch((err) => err)

    expect(error.message).to.contain('arguments required')
  }))

  lab.test('should bypass hashing', co.wrap(function * () {
    let user = yield User
      .forge({
        name: 'Hello World',
        email: 'hello@world.com',
        password: 'password'
      })
      .save(null, { bcrypt: false })

    expect(user.get('password')).to.equal('password')
  }))

  lab.test('should throw when rehashing', co.wrap(function * () {
    let user = yield User.forge({ email: 'Raina_Kunde14@hotmail.com' }).fetch()

    let error = yield user.save('password', bcrypt.hashSync('password', 12))
    .catch((err) => err)

    expect(error).to.be.instanceof(User.BcryptRehashDetected)
  }))

  lab.test('should correctly detect rehash', co.wrap(function * () {
    let user = yield User.forge({ email: 'Raina_Kunde14@hotmail.com' }).fetch()
    let hash = bcrypt.hashSync('password', 12)
    let error

    error = yield user.save('password', `abc${hash}`)
    .catch((err) => err)

    expect(error).to.not.be.instanceof(User.BcryptRehashDetected)

    error = yield user.save('password', hash.replace('$2a$', '$2b$'))
    .catch((err) => err)

    expect(error).to.be.instanceof(User.BcryptRehashDetected)

    error = yield user.save('password', hash.replace('$2a$', '$2y$'))
    .catch((err) => err)

    expect(error).to.be.instanceof(User.BcryptRehashDetected)

    error = yield user.save('password', hash.replace('$2a$', '$nn$'))
    .catch((err) => err)

    expect(error).to.not.be.instanceof(User.BcryptRehashDetected)

    error = yield user.save('password', hash.replace('$12$', '$nn$'))
    .catch((err) => err)

    expect(error).to.not.be.instanceof(User.BcryptRehashDetected)
  }))

  lab.test('should not bootstrap on unconfigured models', co.wrap(function * () {
    let Model = db.bookshelf.Model.extend({ tableName: 'users' })
    let user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: 'password'
    })
    .save()

    expect(user.compare).to.be.undefined()
    expect(user.get('password')).to.equal('password')
  }))

  lab.test('should be able to change rounds', co.wrap(function * () {
    let bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      rounds: 5
    })

    let Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' }
    })

    let user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: 'password'
    })
    .save()

    expect(user.get('password').split('$')[2]).to.equal('05')
  }))

  lab.test('should not override child\'s initialization', co.wrap(function * () {
    let initialized = false
    let bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      rounds: 5
    })

    let Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' },
      initialize () {
        initialized = true
      }
    })

    let user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: 'password'
    })
    .save()

    expect(initialized).to.be.true()
    expect(user.get('password').split('$')[2]).to.equal('05')
  }))

  lab.test('should not call extended two times', co.wrap(function * () {
    let bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'))

    let Model = bookshelf.Model.extend({
      tableName: 'users'
    })

    let error = yield Model.forge({ email: 'wont@exists' })
    .fetch({ require: true })
    .catch(err => err)

    expect(error).to.be.instanceof(bookshelf.Model.NotFoundError)
  }))

  lab.test('should capture hash errors', co.wrap(function * () {
    let bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      rounds: 'abc'
    })

    let Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' }
    })

    let error = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: 'password'
    })
    .save()
    .catch((err) => err)

    expect(error.message).to.contain('Invalid salt')
  }))

  lab.test('should be able to change rehash behaviour', co.wrap(function * () {
    let rehash = false
    let bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      onRehash: function () {
        rehash = `Detected rehash on ${this.tableName}`
      }
    })

    let Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' }
    })

    let user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: bcrypt.hashSync('password', 12)
    })
    .save()

    expect(rehash).to.equal('Detected rehash on users')
    expect(user.get('password').split('$')).to.have.length(4)
  }))

  lab.test('should throw error if null password is detected', co.wrap(function * () {
    yield User
      .forge({
        name: 'Hello World',
        email: 'hello@world.com',
        password: null
      })
      .save()
      .catch((err) => {
        expect(err).to.be.instanceof(User.EmptyPasswordDetected)
      })
  }))

  lab.test('should throw error if undefined password is detected', co.wrap(function * () {
    yield User
      .forge({
        name: 'Hello World',
        email: 'hello@world.com',
        password: undefined
      })
      .save()
      .catch((err) => {
        expect(err).to.be.instanceof(User.EmptyPasswordDetected)
      })
  }))

  lab.test('should bypass plugin if field is empty and allowEmptyPassword option is true', co.wrap(function * () {
    let bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'))

    let Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password', allowEmptyPassword: true }
    })

    let user = yield Model
      .forge({
        name: 'Hello World',
        email: 'hello@world.com',
        password: null
      })
      .save()

    expect(user.get('password')).to.be.null()
  }))
})
