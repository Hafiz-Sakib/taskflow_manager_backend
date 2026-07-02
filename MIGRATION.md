# Migration Notes: Old to New

This documents the reasoning behind the refactor, module by module: old code, new code, why it's better. Only the highest-impact changes are shown in full; smaller ones are summarized inline in the README.

---

## 1. Architecture: fat routes -> layered

**Old** (`routes/tasks.js`, abbreviated):
```js
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('board');
    if (!task || String(task.board.owner) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Task not found' });
    }
    Object.assign(task, req.body);
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

**New:**
```js
// routes/task.routes.js
router.put('/:id', validate(updateTaskSchema), taskController.updateTask);

// controllers/task.controller.js
const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.user._id, req.body);
  new ApiResponse(200, task, 'Task updated').send(res);
});
```

**Why:** the route no longer knows how a task is updated, just that it delegates to a service. Validation happens before the controller runs at all. The try/catch is gone - asyncHandler forwards any thrown error to the centralized handler. This is the pattern applied to every endpoint.

---

## 2. Security bug: task reassignment had no ownership check

**Old:**
```js
Object.assign(task, req.body); // if req.body.board is set, this just changes it
await task.save();
```
A user could send `{ board: '<someone_elses_board_id>' }` and move their task onto a board they don't own - no check ever ran on the new board's ownership.

**New** (`services/task.service.js`):
```js
async function updateTask(taskId, ownerId, payload) {
  const task = await assertOwnedTask(taskId, ownerId);
  const updates = { ...payload };

  if (updates.board && String(updates.board) !== String(task.board._id)) {
    await assertOwnedBoard(updates.board, ownerId); // throws 404 if not owned
  }
}
```

**Why:** ownership of the target resource is validated, not just the source. This class of bug (trusting a foreign-key field from the client) is easy to miss in a quick implementation and easy to catch once you're deliberately asking "what happens if this field points somewhere the user doesn't own?"

---

## 3. Security bug: bulk reorder trusted every task id blindly

**Old:**
```js
router.put('/reorder/bulk', async (req, res) => {
  const { tasks } = req.body;
  const bulkOps = tasks.map((t) => ({
    updateOne: { filter: { _id: t._id }, update: { column: t.column, order: t.order } },
  }));
  await Task.bulkWrite(bulkOps); // no ownership check on any of these ids
  res.json({ message: 'Tasks reordered successfully' });
});
```

**New** (`services/task.service.js`):
```js
async function bulkReorder(ownerId, tasks) {
  const taskIds = tasks.map((t) => t._id);
  const owned = await Task.find({ _id: { $in: taskIds } }).populate('board');

  const allOwned =
    owned.length === taskIds.length &&
    owned.every((t) => t.board && String(t.board.owner) === String(ownerId));

  if (!allOwned) throw ApiError.forbidden('Not authorized to reorder one or more tasks');
  await taskRepository.bulkWrite(bulkOps);
}
```

**Why:** the whole batch is rejected (403) unless every referenced task belongs to the caller. Partial-trust batch operations are a common place for this bug to hide.

---

## 4. Data bug: renaming/removing a board column orphaned tasks

**Old:** `PUT /boards/:id` did a raw `findOneAndUpdate(filter, req.body)`. If `columns` changed, any task still pointing at a column name that no longer existed became invisible in the UI.

**New** (`services/board.service.js`):
```js
async function updateBoard(boardId, ownerId, payload) {
  const existing = await assertOwnedBoard(boardId, ownerId);
  const oldColumns = existing.columns;
  const board = await boardRepository.updateByIdAndOwner(boardId, ownerId, payload);

  if (Array.isArray(payload.columns)) {
    const newColumns = board.columns;
    await Promise.all(
      oldColumns.map(async (oldName, idx) => {
        if (newColumns.includes(oldName)) return;
        const target = newColumns[idx] || newColumns[0];
        await Task.updateMany({ board: board._id, column: oldName }, { column: target });
      })
    );
  }
}
```

**Why:** diffing old vs new columns by position and re-pointing affected tasks means editing a board's columns can never silently strand data.

---

## 5. Auth: single long-lived token to access + rotating refresh token

**Old:**
```js
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
```
A stolen token was valid for a full week with no way to revoke it short of rotating the shared secret (which would log out every user).

**New:**
```js
// utils/tokens.js
signAccessToken(userId, role)   // 15 min, returned in JSON body
signRefreshToken(userId)        // 7 days, httpOnly cookie only

// services/auth.service.js
async function issueSession(user) {
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);
  await userRepository.setRefreshTokenHash(user._id, hashToken(refreshToken));
  return { accessToken, refreshToken };
}
```
`POST /auth/refresh` verifies the cookie, checks its hash against what's stored, and rotates - issuing a new refresh token and invalidating the old one. If a refresh token is replayed after rotation, the session is revoked defensively.

**Why:** a leaked access token is useless within minutes, and refresh tokens can be individually killed on logout or suspected reuse, instead of only expiring naturally.

---

## 6. Validation: manual if-chains to Zod schemas

**Old** (`routes/auth.js`):
```js
if (!name || !email || !password) {
  return res.status(400).json({ message: 'All fields are required' });
}
```

**New:**
```js
// validators/auth.validator.js
const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(50),
    email: z.string().trim().email(),
    password: z.string().min(6).max(100),
  }),
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
```

**Why:** the schema is the single source of truth for what's valid, the controller never sees bad input, and every validation failure across the whole API returns the same shape.

---

## 7. Errors: per-route try/catch to centralized handler

**Old:** every route repeated `catch (error) { res.status(500).json({ message: error.message }) }` - validation errors, duplicate-key errors, and real bugs all came back as generic 500s with a raw Mongoose error message leaking to the client.

**New** (`middleware/errorHandler.js`):
```js
if (error.name === 'ValidationError') error = ApiError.badRequest('Validation failed', errors);
else if (error.code === 11000) error = ApiError.conflict(`${field} already in use`);
else if (error.name === 'CastError') error = ApiError.badRequest(`Invalid ${error.path}`);
else error = ApiError.internal();
```

**Why:** one place translates every kind of error into the right status code and a safe message, and logs it at the right severity.

---

## 8. Security middleware: none to defense in depth

**Old:** `app.use(cors())`, `app.use(express.json())`, nothing else.

**New** (`app.js`): Helmet, explicit CORS whitelist with credentials support (replacing an implicit `origin: '*'`, which can't even be combined with cookies), global + auth-specific rate limiting, `express-mongo-sanitize`, `xss-clean`, `hpp`.

**Why:** none of this existed before. Each one closes a specific, well-known attack class.

---

## 9. Database: hard delete to soft delete plus indexes plus lean queries

**Old:** `Board.findOneAndDelete(...)` / `Task.findByIdAndDelete(...)` - data gone immediately, no audit trail, no undo.

**New:** every model has `isDeleted`/`deletedAt`, and a `pre(/^find/)` hook excludes soft-deleted documents automatically unless explicitly requested. Combined with the new ActivityLog, you can always answer "what happened to this task."

Also added: compound indexes on the actual query patterns, a text index for search, and `.lean()` on every read-only list query.

**Why:** these are the kind of things that don't matter at 10 tasks and absolutely matter at 10,000.
