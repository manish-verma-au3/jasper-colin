const { body, param, query } = require('express-validator');
const { TASK_STATUS } = require('../models/Task');

const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .bail()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('description').optional().trim().isString().withMessage('Description must be a string'),
  body('status')
    .optional()
    .isIn(TASK_STATUS)
    .withMessage(`Status must be one of: ${TASK_STATUS.join(', ')}`),
];

const updateTaskValidation = [
  param('id').isUUID().withMessage('Invalid task ID'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('status')
    .optional()
    .isIn(TASK_STATUS)
    .withMessage(`Status must be one of: ${TASK_STATUS.join(', ')}`),
];

const getTaskByIdValidation = [param('id').isUUID().withMessage('Invalid task ID')];

const listTasksValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

const deleteTaskValidation = [param('id').isUUID().withMessage('Invalid task ID')];

module.exports = {
  createTaskValidation,
  updateTaskValidation,
  getTaskByIdValidation,
  listTasksValidation,
  deleteTaskValidation,
};
