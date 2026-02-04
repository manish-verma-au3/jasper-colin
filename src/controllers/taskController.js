const { Task } = require('../models/Task');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

async function createTask(req, res, next) {
  try {
    const { title, description, status } = req.body;
    const task = await Task.create({
      title,
      description: description || null,
      status: status || 'pending',
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

async function getAllTasks(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const { count, rows } = await Task.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, status } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (title !== undefined) task.title = title;
    if (status !== undefined) task.status = status;
    await task.save();

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Task.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getTaskById(req, res, next) {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
  getTaskById,
};
