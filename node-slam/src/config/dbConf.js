// src/db/databases.js
const Datastore = require('nedb-promises');
const path = require('path');

// __dirname ya está disponible en CommonJS
const dataDir = path.join(__dirname, '../data');

// Users database
const usersDB = Datastore.create({
  filename: path.join(dataDir, 'users.db'),
  autoload: true
});

// Maps database
const mapsDB = Datastore.create({
  filename: path.join(dataDir, 'maps.db'),
  autoload: true
});

// Índices únicos
// usersDB.ensureIndex({ fieldName: 'username', unique: true });
// mapsDB.ensureIndex({ fieldName: 'id', unique: true });

module.exports = { usersDB, mapsDB };
