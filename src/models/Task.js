const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/sequelize');
const { v4: uuidv4 } = require('uuid');

const TASK_STATUS = Object.freeze(['pending', 'in-progress', 'completed']);

const Task = sequelize.define(
  'Task',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Title is required' },
        len: { args: [1, 255], msg: 'Title must be between 1 and 255 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...TASK_STATUS),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [TASK_STATUS],
          msg: `Status must be one of: ${TASK_STATUS.join(', ')}`,
        },
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = { Task, TASK_STATUS };
