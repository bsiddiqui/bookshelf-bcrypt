'use strict'

exports.seed = async function (knex) {
  const users = [
    {
      name: 'Amira Dooley',
      email: 'Raina_Kunde14@hotmail.com',
      password: '$2a$12$jajQAjyjDhsBxii3eD43aO/uZteexr0laWE3pxZa3yxEbGLdlzS3q',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Joaquin Leffler',
      email: 'Brandyn_Collier44@yahoo.com',
      password: '$2a$12$AliB3.f8iZTS0YrlZ40uhOhGWi4SXZ9Z6sTPgaXr6TVsBfipsYILG',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Chaim Herman',
      email: 'Emmie.Stehr@yahoo.com',
      password: '$2a$12$K2CtDP7zSGOKgjXjxD9SYey9mSZ9Udio9C95K6wCKZewSP9oBWyPO',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]
  await knex('users').del()
  return knex('users').insert(users)
}
