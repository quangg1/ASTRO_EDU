/**
 * Wraps an async route/middleware so a rejected promise reaches `errorMiddleware`
 * instead of hanging the request. Removes the try/catch boilerplate from handlers.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (err) {
      next(err);
    }
  };
}

/** Applies `asyncHandler` to every method of a controller object. */
function asyncController(controller) {
  return Object.fromEntries(
    Object.entries(controller).map(([name, fn]) => [
      name,
      typeof fn === 'function' ? asyncHandler(fn) : fn,
    ]),
  );
}

module.exports = { asyncHandler, asyncController };
