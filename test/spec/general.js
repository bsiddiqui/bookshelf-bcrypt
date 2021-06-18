'use strict'

const co = require('co')
const lab = exports.lab = require('@hapi/lab').script()
const expect = require('code').expect

const db = require('../db')
const User = db.bookshelf.model('User')

lab.experiment('general tests', () => {
  lab.beforeEach(co.wrap(function * () {
    yield db.reset()
    yield db.knex.seed.run()
  }))

  lab.test('should work', co.wrap(function * () {
    const user = yield User
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
    const user = yield User.forge({ email: 'Raina_Kunde14@hotmail.com' })
      .fetch()
      .then((user) => user.save('email', 'hello@world'))

    expect(user.hasChanged('password')).to.be.false()
  }))

  lab.test('should compare', co.wrap(function * () {
    const user = yield User.forge({ email: 'Raina_Kunde14@hotmail.com' }).fetch()

    expect(yield user.compare('password')).to.be.true()
    expect(yield user.compare('pwd')).to.be.false()
  }))

  lab.test('should capture compare errors', co.wrap(function * () {
    const user = yield User.forge({ email: 'Raina_Kunde14@hotmail.com' }).fetch()
    const error = yield user.compare().catch((err) => err)

    expect(error.message).to.contain('arguments required')
  }))

  lab.test('should bypass hashing', co.wrap(function * () {
    const user = yield User
      .forge({
        name: 'Hello World',
        email: 'hello@world.com',
        password: 'password'
      })
      .save(null, { bcrypt: false })

    expect(user.get('password')).to.equal('password')
  }))

  lab.test('boom should throw when rehashing', co.wrap(function * () {
    const bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      detectBcrypt: password => password.length > 10
    })

    const Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' }
    })

    const user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: '123'
    })
      .save()

    expect(user.get('password').split('$')).to.have.length(4)

    yield user.save('password', '12345678910')
      .catch((err) => {
        expect(err).to.be.instanceof(Model.BcryptRehashDetected)
      })
  }))

  lab.test('should not bootstrap on unconfigured models', co.wrap(function * () {
    const Model = db.bookshelf.Model.extend({ tableName: 'users' })
    const user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: 'password'
    })
      .save()

    expect(user.compare).to.be.undefined()
    expect(user.get('password')).to.equal('password')
  }))

  lab.test('should be able to change rounds', co.wrap(function * () {
    const bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      rounds: 5
    })

    const Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' }
    })

    const user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: 'password'
    })
      .save()

    expect(user.get('password').split('$')[2]).to.equal('05')
  }))

  lab.test('should not override child\'s initialization', co.wrap(function * () {
    let initialized = false
    const bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      rounds: 5
    })

    const Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' },
      initialize () {
        initialized = true
      }
    })

    const user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: 'password'
    })
      .save()

    expect(initialized).to.be.true()
    expect(user.get('password').split('$')[2]).to.equal('05')
  }))

  lab.test('should not call extended two times', co.wrap(function * () {
    const bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'))

    const Model = bookshelf.Model.extend({
      tableName: 'users'
    })

    const error = yield Model.forge({ email: 'wont@exists' })
      .fetch({ require: true })
      .catch(err => err)

    expect(error).to.be.instanceof(bookshelf.Model.NotFoundError)
  }))

  lab.test('should capture hash errors', co.wrap(function * () {
    const bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      rounds: 'abc'
    })

    const Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' }
    })

    const error = yield Model.forge({
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
    const bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'), {
      onRehash: function () {
        rehash = `Detected rehash on ${this.tableName}`
      },
      detectBcrypt: password => password.length > 10
    })

    const Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password' }
    })

    const user = yield Model.forge({
      name: 'Hello World',
      email: 'hello@world.com',
      password: '12345678910'
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
    const bookshelf = require('bookshelf')(db.bookshelf.knex)
    bookshelf.plugin(require('../../'))

    const Model = bookshelf.Model.extend({
      tableName: 'users',
      bcrypt: { field: 'password', allowEmptyPassword: true }
    })

    const user = yield Model
      .forge({
        name: 'Hello World',
        email: 'hello@world.com',
        password: null
      })
      .save()

    expect(user.get('password')).to.be.null()
  }))
})
