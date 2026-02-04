/**
 * Undo migration: drops the tasks table.
 * Run with: npm run migrate:undo
 */
require('dotenv').config();
const { sequelize } = require('./sequelize');

async function migrateUndo() {
  try {
    await sequelize.authenticate();
    await sequelize.query('DROP TABLE IF EXISTS tasks CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS task_status_enum CASCADE;');
    console.log('Migration undone. tasks table dropped.');
  } catch (error) {
    console.error('Undo migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrateUndo();
