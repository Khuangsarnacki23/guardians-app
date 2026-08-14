// lib/errors.js
// Centralized error reporting. Set DEBUG_ERRORS=1 in Vercel to include the real
// error name/message/stack in HTTP responses while debugging, then remove it --
// error internals should not be public in normal operation.

const DEBUG = process.env.DEBUG_ERRORS === "1";

/**
 * Logs an error with full detail (always) and returns a JSON response whose
 * verbosity depends on DEBUG_ERRORS.
 *
 * @param {object} res       express response
 * @param {Error}  err       the caught error
 * @param {string} fallback  user-facing message when not debugging
 * @param {object} context   extra fields to log, e.g. { route, userId }
 */
function sendError(res, err, fallback, context = {}) {
  const detail = {
    ...context,
    name: err?.name,
    message: err?.message,
    code: err?.code,
    // Mongo driver attaches these on connection failures
    codeName: err?.codeName,
    reason: err?.reason?.type,
  };

  console.error(
    `[ERROR] ${fallback} :: ${JSON.stringify(detail)}\n${err?.stack || ""}`
  );

  const body = { success: false, error: fallback };

  if (DEBUG) {
    body.debug = {
      ...detail,
      stack: (err?.stack || "").split("\n").slice(0, 6),
    };
  }

  return res.status(500).json(body);
}

/** Wraps an async route handler so rejections reach the error middleware. */
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { sendError, asyncRoute, DEBUG };
