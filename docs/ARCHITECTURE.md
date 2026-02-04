# High-Traffic Task Management System — Architecture Design

This document describes the architecture for a Node.js application that serves high traffic, uses PostgreSQL, handles millions of tasks and concurrent users, and integrates Keycloak for RBAC, with logging, monitoring, caching, and message queuing.

---

## 1. Application Architecture Overview

### 1.1 High-Level Design

The system is designed as a **multi-tier, horizontally scalable** architecture:

- **API layer**: Stateless Node.js (Express) services behind a load balancer.
- **Auth layer**: Keycloak for identity and RBAC; APIs validate JWT and enforce roles.
- **Data layer**: PostgreSQL with read replicas, connection pooling, and partitioning for tasks.
- **Cache layer**: Redis for session, hot data, and rate-limiting.
- **Queue layer**: Message queue (e.g. RabbitMQ or SQS) for async and background work.
- **Observability**: Centralized logging (e.g. ELK/Loki), metrics (Prometheus), tracing (OpenTelemetry), and alerting.

### 1.2 Database Design

**PostgreSQL as primary database**

- **Tasks table**: Partitioned by time or by tenant/user to keep single-table size and index depth manageable.
  - Partitioning strategy: Range partitioning on `created_at` (e.g. monthly) or list partitioning on `tenant_id` if multi-tenant.
  - Indexes: B-tree on `(user_id, status)`, `(user_id, created_at DESC)` for list/dashboard queries; partial indexes for “active” tasks (`status IN ('pending','in-progress')`) to speed up common filters.
- **Users / identities**: Synced from Keycloak or stored minimally (id, keycloak_id, role); detailed identity lives in Keycloak.
- **RBAC**: `roles` and `permissions` tables (or Keycloak roles only); optional `user_roles` if you mirror roles in DB for quick checks.
- **Migrations**: Versioned migrations (e.g. Sequelize/Umzug or Flyway); zero-downtime patterns (add column → backfill → switch).

**Scalability and durability**

- **Connection pooling**: PgBouncer (or RDS Proxy) in front of PostgreSQL to limit connections and reuse them across many API instances.
- **Read replicas**: Writes to primary; reads (list tasks, get-by-id, dashboards) from replicas with replication lag handled (e.g. read-your-writes via sticky session or short delay).
- **High availability**: Primary + synchronous replica (or multi-AZ); automated failover; health checks that exclude replica lag from “healthy” when needed.

### 1.3 API Scalability

- **Stateless API**: No in-process session state; all auth state in JWT + Keycloak; optional session cache in Redis.
- **Horizontal scaling**: Run N API instances behind a load balancer (e.g. ALB, Nginx, cloud LB); scale based on CPU, request rate, or queue depth.
- **Rate limiting**: Per-user and per-IP limits in Redis (e.g. sliding window); return 429 with Retry-After.
- **Pagination and limits**: Cursor-based pagination for large lists (e.g. `created_at + id`); strict max page size (e.g. 100) to protect DB and memory.
- **Idempotency**: For create/update, accept `Idempotency-Key` header and store result in Redis/DB to avoid duplicates under retries.
- **API versioning**: URL (e.g. `/v1/tasks`) or header; allows independent evolution and scaling of versions.

### 1.4 Authentication Setup (Keycloak + RBAC)

- **Keycloak**: Identity provider; issues JWT access tokens (and optionally refresh tokens).
  - **Realm / clients**: One realm per environment; separate clients for web, mobile, and server-to-server if needed.
  - **Roles**: Define roles (e.g. `user`, `admin`, `viewer`) and map to permissions (e.g. `tasks:read`, `tasks:write`, `tasks:delete`, `tasks:admin`).
- **API integration**:
  - Each request: Extract JWT from `Authorization: Bearer <token>`; verify signature and expiry (using Keycloak’s JWKS endpoint or cached keys).
  - After verification: Map token’s `realm roles` and `resource roles` to application roles; enforce RBAC per endpoint (e.g. middleware that checks `roles` or `permissions`).
- **RBAC model**:
  - **Role–permission matrix**: e.g. `user` → `tasks:read`, `tasks:write` (own); `admin` → all task actions + user management.
  - **Enforcement**: Middleware per route (e.g. `requirePermission('tasks:write')`); optionally attribute-based (e.g. “only own tasks”) by comparing `sub` (or `user_id`) with resource owner.
- **Service accounts**: For server-to-server (workers, cron), use Keycloak client credentials flow; issue tokens with limited scope/roles and validate same way.

---

## 2. Architecture Diagram (Text Description)

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                        CLIENTS                               │
                                    │   (Web, Mobile, Server-to-Server, Cron Jobs)                 │
                                    └───────────────────────────┬─────────────────────────────────┘
                                                                │ HTTPS
                                                                ▼
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                   CDN / WAF (optional)                      │
                                    └───────────────────────────┬─────────────────────────────────┘
                                                                │
                                    ┌───────────────────────────▼─────────────────────────────────┐
                                    │              LOAD BALANCER (ALB / Nginx / Cloud LB)          │
                                    └───────────────────────────┬─────────────────────────────────┘
                                                                │
        ┌───────────────────────────────────────────────────────┼───────────────────────────────────────┐
        │                                                       │                                       │
        ▼                                                       ▼                                       ▼
┌───────────────┐                                     ┌───────────────┐                         ┌───────────────┐
│  API Server   │                                     │  API Server   │                         │  API Server   │
│  (Node.js)    │                                     │  (Node.js)    │                         │  (Node.js)    │
│  Stateless    │                                     │  Stateless    │                         │  Stateless    │
└───────┬───────┘                                     └───────┬───────┘                         └───────┬───────┘
        │                                                     │                                               │
        │  JWT validation / RBAC                              │                                               │
        ▼                                                     ▼                                               ▼
┌───────────────┐                                     ┌───────────────────────────────────────────────────────┐
│   Keycloak    │◄────────────────────────────────────│  Shared: Redis (cache, rate-limit, sessions)          │
│   (Auth/RBAC) │                                     └───────────────────────────────────────────────────────┘
└───────────────┘                                                                   │
        │                                                                           │
        │                                                     ┌─────────────────────┼─────────────────────┐
        │                                                     │                     │                     │
        │                                                     ▼                     ▼                     ▼
        │                                             ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
        │                                             │  PostgreSQL   │     │   Message     │     │  Logging /    │
        │                                             │  Primary      │     │   Queue       │     │  Metrics      │
        │                                             │  (writes)     │     │ (RabbitMQ/    │     │  (ELK/Loki,   │
        │                                             └───────┬───────┘     │  SQS/Kafka)   │     │  Prometheus)  │
        │                                                     │             └───────┬───────┘     └───────────────┘
        │                                                     │                     │
        │                                                     │ Replication         │ Consumers
        │                                                     ▼                     ▼
        │                                             ┌───────────────┐     ┌───────────────┐
        └───────────────────────────────────────────►│  PostgreSQL   │     │  Workers      │
                                                      │  Replica(s)   │     │  (Node.js /   │
                                                      │  (reads)     │     │   other)      │
                                                      └───────────────┘     └───────────────┘
```

**Flow summary**

1. **Clients** → **Load balancer** → **API servers** (stateless, scaled horizontally).
2. **API** validates JWT with **Keycloak** (JWKS), applies **RBAC**, then serves request.
3. **API** reads/writes **PostgreSQL** (writes to primary; reads from primary or replicas); uses **Redis** for cache and rate limiting.
4. **Background work** is pushed to **message queue**; **workers** consume and process (e.g. send emails, sync, analytics).
5. **Logs and metrics** are sent to centralized **logging and monitoring** for troubleshooting and performance.

---

## 3. Caching (Frequently Accessed Tasks)

### 3.1 Strategy

- **Cache store**: Redis (or Redis Cluster for very high throughput).
- **What to cache**: Hot tasks (e.g. single task by ID after first read; small, filtered lists for “my active tasks” per user).
- **What not to cache**: Full list with arbitrary filters (or cache with short TTL and invalidation on write).

### 3.2 Implementation

**Cache-aside (lazy loading)**

- **Get task by ID**: On read, check Redis key `task:{id}`. If miss, read from PostgreSQL (or read replica), then set Redis with TTL (e.g. 5–15 minutes). Return value.
- **Invalidation**: On update or delete of task `id`, delete `task:{id}` from Redis (or publish invalidation event so all API nodes drop it). Optionally use Redis pub/sub to invalidate other instances’ in-memory caches if you add a local cache layer later.
- **Lists**: Cache key like `tasks:user:{userId}:status:{status}:cursor:{cursor}` for paginated “my tasks” with short TTL (1–2 min). Invalidate on create/update/delete for that user (e.g. delete keys matching `tasks:user:{userId}:*`).

**TTL and eviction**

- Set a max TTL (e.g. 10 minutes) for task entries to avoid stale data; use Redis `volatile-lru` or `allkeys-lru` so Redis can evict under memory pressure.
- Optional: Separate key spaces for “single task” (longer TTL) vs “list” (shorter TTL).

**Connection and resilience**

- Use a Redis client with connection pooling; consider Redis Sentinel or managed Redis for HA.
- On Redis failure, fall back to DB only (degrade gracefully); optionally circuit-breaker to avoid hammering Redis when it’s down.

### 3.3 Pseudo-Code (Get Task by ID)

```
function getTaskById(id, userId):
  cacheKey = "task:" + id
  cached = redis.get(cacheKey)
  if cached then return JSON.parse(cached)

  task = db.tasks.findByPk(id)  // or read from replica
  if not task or not canRead(userId, task) then return 404

  redis.setex(cacheKey, 600, JSON.stringify(task))  // 10 min TTL
  return task
```

On update/delete of `id`: `redis.del("task:" + id)`.

---

## 4. Message Queuing (Background Task Processing)

### 4.1 Role of the Queue

- **Decouple** heavy or slow work from the HTTP request (e.g. notifications, exports, sync to analytics).
- **Reliability**: Retries and dead-letter queue (DLQ) for failed jobs.
- **Backpressure**: Accept requests immediately; process in background so API stays responsive under load.

### 4.2 Technology Choices

- **RabbitMQ**: Good for complex routing, priorities, and at-least-once delivery; suitable for task-oriented workloads.
- **AWS SQS**: Managed, scalable; at-least-once; use FIFO queues where ordering matters.
- **Kafka**: For very high throughput and event streaming; more operational overhead.

Recommendation: **RabbitMQ** or **SQS** for “task job” pattern; **Kafka** if you need event log and many consumers.

### 4.3 Implementation

**Producers (API layer)**

- After a successful action (e.g. task created, status changed to “completed”), publish a message to the queue instead of doing heavy work in the request.
- Message body: JSON with event type, task id, user id, timestamp, and any payload needed for the worker.
- Example: `{ "event": "task.completed", "taskId": "...", "userId": "...", "at": "..." }`.

**Queues and topology (e.g. RabbitMQ)**

- **Exchange**: e.g. `task.events` (topic).
- **Queues**: e.g. `task.notifications`, `task.analytics`, `task.export`; bind with routing keys like `task.completed`, `task.created`.
- **Workers**: Separate processes (Node.js or other) that consume from these queues; ack after successful processing; nack/requeue or send to DLQ on failure.

**Workers**

- **Notifications**: Consume `task.completed` (and others); send email/push; retry with backoff (e.g. 3 times); then DLQ.
- **Analytics**: Consume task events; aggregate in warehouse or time-series DB.
- **Exports**: Consume “export requested” jobs; generate file (e.g. CSV); store in object storage; notify user.

**Reliability**

- **Idempotency**: Workers use task/job id (or idempotency key) to avoid duplicate side effects (e.g. send email once per event).
- **Retries**: Exponential backoff; max retries then move to DLQ; alert on DLQ depth.
- **Scaling**: Run multiple worker instances; queue distributes load; scale worker count with queue depth (e.g. autoscaling metric).

### 4.4 Pseudo-Code (API Producer + Worker)

**API (after creating task):**

```
function createTask(req, res):
  task = db.tasks.create(...)
  queue.publish("task.events", { event: "task.created", taskId: task.id, userId: req.user.id })
  res.status(201).json(task)
```

**Worker:**

```
queue.consume("task.notifications", async (msg) => {
  const { event, taskId, userId } = msg.body
  if (event === "task.completed") {
    await sendNotification(userId, "Task completed", taskId)
  }
  msg.ack()
})
```

---

## 5. Logging and Monitoring (Troubleshooting and Performance)

### 5.1 Logging

- **Structured logs**: JSON with timestamp, level, request id, user id, endpoint, duration, error code.
- **Correlation**: Generate or propagate `request-id` (and optionally trace id) across API → queue → workers so one request can be traced end-to-end.
- **Destination**: Ship logs to centralized store (e.g. ELK, Loki, CloudWatch Logs); avoid storing secrets or full tokens.
- **Levels**: Error and WARN in production; INFO for request summary; DEBUG only in non-production or sampled.

### 5.2 Metrics

- **Scrape**: Prometheus scraping `/metrics` from each API and worker (e.g. default Express + `prom-client`).
- **Key metrics**: Request rate, latency (p50, p95, p99), error rate by route and status; DB connection pool usage; cache hit ratio; queue length and consumer lag.
- **Alerting**: Alert on high error rate, high latency, DB/replica lag, Redis down, queue depth or DLQ growth.

### 5.3 Tracing (Optional but Recommended)

- **OpenTelemetry**: Instrument API and workers; export spans to Jaeger or similar.
- **Use**: See end-to-end latency from LB → API → DB/Redis/Keycloak and API → queue → worker.

---

## 6. Summary Table

| Concern              | Approach                                                                 |
|----------------------|--------------------------------------------------------------------------|
| **Database**         | PostgreSQL; partitioning; read replicas; PgBouncer; HA (primary + replica). |
| **API scale**        | Stateless Node.js; horizontal scaling; rate limiting; cursor pagination.  |
| **Auth & RBAC**      | Keycloak JWT; verify in API; enforce roles/permissions per endpoint.    |
| **Caching**          | Redis cache-aside for task by ID and hot lists; TTL and invalidation.    |
| **Background work**  | Message queue (RabbitMQ/SQS); producers in API; workers with retry/DLQ.   |
| **Observability**    | Structured logs + request id; Prometheus metrics; optional tracing.     |

This architecture supports high traffic, millions of tasks, concurrent users, high availability, scalability, RBAC with Keycloak, and clear paths for caching and message queuing.
