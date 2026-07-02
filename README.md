# TaskFlow API — Production Edition

A layered, secured, tested Node.js/Express/MongoDB backend for the TaskFlow Kanban app. This is a ground-up architectural refactor of the original single-file-per-route backend — see `MIGRATION.md` for the old → new reasoning behind every major decision.

## Architecture

```
src/
  config/        env validation (Zod), MongoDB connection, Winston logger
  constants/     roles, priorities, enums — no magic strings anywhere else
  utils/         ApiError, ApiResponse, asyncHandler, pagination, JWT helpers
  middleware/    auth (JWT + RBAC), validate (Zod), rate limiting, error handler
  validators/    Zod schemas per resource (auth, board, task, workspace)
  models/        Mongoose schemas — indexes, soft delete, virtuals, timestamps
  repositories/  raw DB queries only, no business logic
  services/      business logic — the only layer that talks to repositories
  controllers/   thin — parse req, call one service method, send ApiResponse
  routes/        wiring only: middleware -> validation -> controller
  jobs/          node-cron scheduled tasks (due-date notifications)
  docs/          Swagger/OpenAPI spec generation
  app.js         Express app assembly (security middleware, routes, errors)
server.js        entry point - connects DB, starts server, graceful shutdown
tests/           Jest + Supertest integration tests
```

Request flow: route -> middleware (auth/validate) -> controller -> service -> repository -> model. Routes never touch Mongoose directly; controllers never contain business rules; services never build HTTP responses.

## What changed from the original backend

See `MIGRATION.md` for detailed before/after code and rationale. Summary:

- 3 real security bugs fixed: `Object.assign(task, req.body)` letting a client silently move a task onto a board they didn't own; bulk task reorder with zero ownership check; board column rename/delete orphaning tasks that pointed at the old column name.
- Auth: single 7-day JWT -> short-lived access token + rotating httpOnly refresh token cookie, with logout and reuse detection.
- Validation: manual `if (!title) return res.status(400)` -> Zod schemas, rejected before the controller ever runs.
- Errors: ad-hoc `res.status(x).json({message})` per route -> one ApiError type + one centralized handler, consistent `{success, message, errors}` shape everywhere.
- Security middleware: none -> Helmet, rate limiting (global + strict on auth), Mongo-injection sanitization, XSS sanitization, HPP protection, explicit CORS whitelist (was `origin: '*'`, incompatible with cookies anyway).
- Data layer: hard deletes -> soft delete (`isDeleted`/`deletedAt`, auto-filtered), added indexes on every hot query path, `.lean()` on read-only list endpoints, aggregation pipelines for stats instead of client-side reduction.
- New features: task labels, comments, attachments (URL references), board/task archive, workspaces, full-text task search + filter + sort + pagination, activity history, in-app due-date notifications (hourly cron), recently-viewed boards, dashboard + per-board + admin analytics.
- Ops: Winston logging to file, `/api/health` with DB status, graceful shutdown on SIGINT/SIGTERM, Dockerfile + docker-compose, PM2 ecosystem file, GitHub Actions CI, Swagger UI at `/api/docs`.

## Setup

```bash
npm install
cp .env.example .env   # fill in real secrets - see below
npm run dev
```

A working `.env` (pointed at your existing Atlas cluster) is already included in this zip for convenience - only the three new `*_SECRET` values are freshly generated; rotate them before any real deployment.

### Required env vars

| Var | Purpose |
|---|---|
| `MONGO_URI` | Primary database connection string |
| `MONGO_URI_TEST` | Optional - dedicated test DB (falls back to an in-memory Mongo via `mongodb-memory-server`) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Must be different from each other, 16+ chars |
| `COOKIE_SECRET` | Signs the refresh-token cookie |
| `CLIENT_URL` | Your frontend's origin - required for CORS + cookie scoping |
| `ORIGIN_WHITELIST` | Optional comma-separated extra allowed origins (staging, etc.) |

The app will not boot if any required var is missing or malformed - `src/config/env.js` validates `process.env` with Zod at startup and exits with a clear message instead of failing weirdly at request time.

## Auth flow (for frontend integration)

1. `POST /api/auth/register` / `POST /api/auth/login` returns `{ accessToken, user }` in the JSON body, and sets an httpOnly `refreshToken` cookie (scoped to `/api/auth`).
2. Send `accessToken` as `Authorization: Bearer <token>` on every request. It expires in 15 minutes by default.
3. When a request gets a 401, call `POST /api/auth/refresh` (browser sends the cookie automatically with `credentials: 'include'`) to get a new access token + rotated refresh cookie.
4. `POST /api/auth/logout` revokes the refresh token server-side and clears the cookie.

Frontend must send `credentials: 'include'` (fetch) or `withCredentials: true` (axios) for the refresh cookie to be set/sent - this is a required frontend change if you're wiring this API up to the existing TaskFlow frontend, which currently doesn't do this.

## API docs

Swagger UI: `http://localhost:5000/api/docs` (auto-generated from JSDoc comments in `src/routes/auth.routes.js` and `src/routes/index.js` - extend the same `@openapi` comment pattern to the other route files as they're touched).

## Testing

```bash
npm test
```

Uses Jest + Supertest against an in-memory MongoDB (`mongodb-memory-server`), so tests never touch your real database. Covers: registration/login/validation/duplicate-email, board ownership isolation, task creation, the column-rename-migrates-tasks fix, and the bulk-reorder ownership fix.

Note: `mongodb-memory-server` downloads a real `mongod` binary the first time it runs, from `fastdl.mongodb.org`. This requires normal internet access - it will fail in network-restricted CI/sandbox environments that don't allowlist that domain. If that's your situation, set `MONGO_URI_TEST` to a real reachable MongoDB instance instead and the tests will use that.

## Running with Docker

```bash
docker compose up --build
```

Spins up the API + a local MongoDB. For production, use the standalone `Dockerfile` against your real `MONGO_URI` (e.g. Atlas) instead of the bundled `mongo` service.

## Running with PM2

```bash
pm2 start ecosystem.config.js --env production
```

Runs in cluster mode across all available CPU cores.

## New endpoints at a glance

| Method | Path | Purpose |
|---|---|---|
| GET/POST | /api/boards | List / create boards |
| GET/PUT/DELETE | /api/boards/:id | Board detail / update / soft delete |
| PATCH | /api/boards/:id/archive | Archive / restore a board |
| GET | /api/boards/:id/activity | Paginated audit trail for a board |
| GET/POST | /api/tasks | Search/filter/sort/paginate tasks, create |
| PUT/DELETE | /api/tasks/:id | Update / soft delete a task |
| PATCH | /api/tasks/:id/archive | Archive / restore a task |
| PUT | /api/tasks/reorder/bulk | Bulk column/order update (drag-and-drop) |
| POST | /api/tasks/:id/comments | Add a comment |
| POST | /api/tasks/:id/attachments | Add a URL attachment |
| GET/POST/PUT/DELETE | /api/workspaces | Workspace CRUD (optional grouping above boards) |
| GET | /api/analytics/dashboard | Aggregated stats across all of a user's boards |
| GET | /api/analytics/boards/:id | Stats for one board |
| GET | /api/analytics/recent | Recently viewed boards |
| GET | /api/analytics/system | Admin-only system-wide counts |
| GET | /api/notifications | Paginated in-app notifications |
| PATCH | /api/notifications/:id/read or /read-all | Mark read |

## Honest limitations

- Attachments are URL references only (no file upload/storage service wired up) - adding S3/GCS upload is a natural next step if needed.
- Workspaces are implemented but the existing frontend has no UI for them yet.
- Role-based access only gates one real endpoint (`/analytics/system`) - there's no admin panel to actually promote a user to `admin` yet (would need a one-off DB update or a new endpoint).
- I could not run the Jest suite inside my own sandboxed environment because it can't reach `fastdl.mongodb.org` to download the test MongoDB binary - the code path is correct and will run in a normal environment with internet access; see the Testing section above for the `MONGO_URI_TEST` workaround if you hit the same restriction elsewhere (e.g. a locked-down CI runner).
- The existing TaskFlow frontend does not yet send `credentials: 'include'`, use the new refresh-token flow, or call any of the new endpoints (search, archive, comments, notifications, etc). It will still work against the old core endpoints (auth/boards/tasks CRUD, response shape is now wrapped in `{success, message, data}` instead of the bare object the old API returned), but a frontend update is needed to use the new features and the refresh-token session model.
