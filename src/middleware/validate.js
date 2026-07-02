const ApiError = require('../utils/ApiError');

/**
 * WHY: Controllers used to start with 5-10 lines of `if (!title) return
 * res.status(400)...`. That's duplicated per route and easy to forget a
 * field. This middleware runs BEFORE the controller, validates body/query/
 * params against a Zod schema, and rejects with a structured error list if
 * anything is wrong — the controller only ever sees clean, typed input.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.slice(1).join('.'),
      message: issue.message,
    }));
    return next(ApiError.badRequest('Validation failed', errors));
  }

  if (result.data.body) req.body = result.data.body;
  if (result.data.params) req.params = result.data.params;

  next();
};

module.exports = validate;
