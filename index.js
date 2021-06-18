'use strict'

const merge = require('lodash.merge')
const get = require('lodash.get')
const bcrypt = require('bcrypt')

// https://paragonie.com/blog/2016/02/how-safely-store-password-in-2016
const RECOMMENDED_ROUNDS = 12

module.exports = (bookshelf, settings) => {
  const BookshelfModel = bookshelf.Model

  // Add default settings
  settings = merge({
    allowEmptyPassword: false,
    rounds: RECOMMENDED_ROUNDS,
    detectBcrypt: () => false,
    onRehash: function () {
      throw new this.constructor.BcryptRehashDetected()
    }
  }, settings)

  /**
   * Hashes a string and stores it inside the provided model
   * @param {String} string A string to be hashed
   * @param {String} field The field that will receive the hashed string
   * @param {Object} model An instantiated bookshelf model
   * @throws {BcryptRehashDetected} If it detects a rehash
   * @return {Promise} A promise that resolves with the model correctly updated
   */
  function hashAndStore (string, field, model) {
    return new Promise(function (resolve, reject) {
      // Avoid rehashing a string by mistake but allow users to implement
      // non throwing logic
      if (settings.detectBcrypt(string) && typeof settings.onRehash === 'function') {
        try {
          settings.onRehash.call(model)
        } catch (err) {
          return reject(err)
        }
      }

      bcrypt.hash(string, settings.rounds, (err, hash) => {
        if (err) return reject(err)

        // Set the field and resolves the promise
        model.set(field, hash)
        resolve(model)
      })
    })
  }

  /**
   * Compares a string against a bcrypt hash
   * @param {String} str The raw string to be compared
   * @param {String} hash A bcrypt hash to match against the string
   * @return {Promise} A promise that resolves to a boolean indicating if the
   * hash was generated from the provided string
   */
  function compare (str, hash) {
    return new Promise(function (resolve, reject) {
      bcrypt.compare(str, hash, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }

  /**
   * Custom error class for throwing when this plugin detects a rehash
   * @type {Error}
   */
  bookshelf.BcryptRehashDetected = BookshelfModel.BcryptRehashDetected = class extends Error {
    constructor () {
      super('Bcrypt tried to hash another bcrypt hash')
      this.name = 'BcryptRehashDetected'
    }
  }

  /**
   * Custom error class for throwing when this plugin detects a null or undefined password
   * @type {Error}
   */
  bookshelf.EmptyPasswordDetected = BookshelfModel.EmptyPasswordDetected = class extends Error {
    constructor () {
      super('Bcrypt cannot hash a null or undefined password')
      this.name = 'EmptyPasswordDetected'
    }
  }

  // Extends the default model class
  bookshelf.Model = bookshelf.Model.extend({}, {
    extended (child) {
      // Check if the extended model has the bcrypt option
      const field = get(child.prototype, 'bcrypt.field')

      // Configure bcrypt only for enabled models
      if (field) {
        const initialize = child.prototype.initialize

        child.prototype.initialize = function () {
          // Do not override child's initialization
          if (initialize) initialize.call(this)

          // Hash the password when saving
          this.on('saving', (model, attrs, options) => {
            const field = get(this, 'bcrypt.field')

            if (model.hasChanged(field) && options.bcrypt !== false) {
              const password = model.get(field)

              if (password !== null && typeof password !== 'undefined') {
                return hashAndStore(password, field, model)
              } else if (this.bcrypt.allowEmptyPassword !== true) {
                throw new this.constructor.EmptyPasswordDetected()
              }
            }
          })
        }

        /**
         * Compares a string against a bcrypt hash stored in the current model
         * @param {String} str The string to compare against the hash
         * @return {Promise} A promise that resolves to a boolean indicating if
         * the provided string is valid or not
         */
        child.prototype.compare = function (str) {
          return compare(str, this.get(field))
        }
      }
    }
  })
}
