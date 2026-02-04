/**
 * Migration script: creates the tasks table and enum type in PostgreSQL.
 * Run with: npm run migrate
 */
require('dotenv').config();
const { sequelize } = require('./sequelize');
const { Task } = require('../models/Task');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    await sequelize.sync({ force: false });
    console.log('Migration completed. Tables are in sync.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
