const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { validate } = require('../middleware/validate');
const { unwrapSamplePayload } = require('../middleware/unwrapSamplePayload');
const {
  createTaskValidation,
  updateTaskValidation,
  getTaskByIdValidation,
  listTasksValidation,
  deleteTaskValidation,
} = require('../validators/taskValidators');

router.post('/', unwrapSamplePayload, validate(createTaskValidation), taskController.createTask);
router.get('/', validate(listTasksValidation), taskController.getAllTasks);
router.get('/:id', validate(getTaskByIdValidation), taskController.getTaskById);
router.patch('/:id', validate(updateTaskValidation), taskController.updateTask);
router.delete('/:id', validate(deleteTaskValidation), taskController.deleteTask);

module.exports = router;
