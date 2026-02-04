const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelizeOptions = {
  dialect: dbConfig.dialect,
  logging: dbConfig.logging,
  define: {
    underscored: true,
    timestamps: true,
  },
};

// Use connection string if provided (e.g. DATABASE_URL=postgres://user:pass@host:5432/dbname)
const sequelize = dbConfig.url
  ? new Sequelize(dbConfig.url, sequelizeOptions)
  : new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
      host: dbConfig.host,
      port: dbConfig.port,
      ...sequelizeOptions,
    });

module.exports = { sequelize, Sequelize };
