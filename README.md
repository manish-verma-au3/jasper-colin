# Task Management System API

Node.js + Express REST API for managing tasks, with PostgreSQL and Sequelize ORM.

## Features

- **Create Task** – `title`, `description`, `status` (pending | in-progress | completed)
- **Get All Tasks** – Paginated list (default 10 per page)
- **Get Task by ID** – Fetch a single task
- **Update Task** – Update `title` and/or `status` by ID
- **Delete Task** – Remove a task by ID
- **Health check** – Database connectivity endpoint

## Prerequisites

- Node.js 18+
- PostgreSQL

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `env.example` to `.env` and set your PostgreSQL credentials:

   ```bash
   cp env.example .env
   ```

   Example:

   ```
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=task_management
   ```

3. **Database**

   Create the database (if it doesn’t exist):

   ```bash
   createdb task_management
   ```

   Run migrations:

   ```bash
   npm run migrate
   ```

   Or apply the schema manually:

   ```bash
   psql -U postgres -d task_management -f src/database/schema.sql
   ```

   Note: The migration script uses Sequelize `sync()` and creates the `tasks` table and enum. The raw `schema.sql` is for reference or manual setup.

4. **Start the server**

   ```bash
   npm start
   ```

   Or with auto-reload:

   ```bash
   npm run dev
   ```

## API Endpoints

| Method | Endpoint            | Description                    |
|--------|---------------------|--------------------------------|
| GET    | `/health`           | Health check (DB connectivity) |
| POST   | `/api/tasks`        | Create a task                  |
| GET    | `/api/tasks`        | List tasks (paginated)         |
| GET    | `/api/tasks/:id`    | Get task by ID                 |
| PATCH  | `/api/tasks/:id`    | Update task                    |
| DELETE | `/api/tasks/:id`    | Delete task                    |

### Create Task

```bash
POST /api/tasks
Content-Type: application/json

{
  "title": "My task",
  "description": "Optional description",
  "status": "pending"   // optional: pending | in-progress | completed
}
```

### Get All Tasks (pagination)

```bash
GET /api/tasks?page=1&limit=10
```

### Update Task

```bash
PATCH /api/tasks/:id
Content-Type: application/json

{
  "title": "Updated title",
  "status": "in-progress"
}
```

### Delete Task

```bash
DELETE /api/tasks/:id
```

## Database Schema

**Table: `tasks`**

| Column       | Type      | Constraints                          |
|-------------|-----------|--------------------------------------|
| id          | UUID      | Primary Key, default `gen_random_uuid()` |
| title       | VARCHAR(255) | NOT NULL                         |
| description | TEXT      | Optional                             |
| status      | ENUM      | pending, in-progress, completed      |
| created_at  | TIMESTAMP | Default: current time                |
| updated_at  | TIMESTAMP | Auto-update on modify                |

## Tech Stack

- **Express** – Web framework
- **Sequelize** – ORM for PostgreSQL
- **express-validator** – Request validation
- **dotenv** – Environment variables
- **uuid** – Task IDs

## Scripts

- `npm start` – Start server
- `npm run dev` – Start with watch mode
- `npm run migrate` – Run database migration (sync)
- `npm run migrate:undo` – Drop tasks table (undo)
