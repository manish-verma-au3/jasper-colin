require('dotenv').config();
const express = require('express');
const tasksRouter = require('./routes/tasks');
const healthRouter = require('./routes/health');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
const { requireJson } = require('./middleware/requireJson');
app.use('/api/tasks', requireJson);

app.use('/health', healthRouter);
app.use('/api/tasks', tasksRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'Task Management System API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      createTask: 'POST /api/tasks',
      getAllTasks: 'GET /api/tasks?page=1&limit=10',
      getTask: 'GET /api/tasks/:id',
      updateTask: 'PATCH /api/tasks/:id',
      deleteTask: 'DELETE /api/tasks/:id',
    },
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
