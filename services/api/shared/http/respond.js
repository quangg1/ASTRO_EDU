/**
 * Single success envelope for the whole API: `{ success: true, ... }`.
 * Errors are produced exclusively by `shared/errors.js`, so clients only ever
 * branch on `success`.
 */

function ok(res, payload = {}) {
  return res.status(200).json({ success: true, ...payload });
}

function created(res, payload = {}) {
  return res.status(201).json({ success: true, ...payload });
}

function noContent(res) {
  return res.status(204).end();
}

/**
 * Paged list response. `page`/`limit` are echoed back so the client does not
 * have to remember what it asked for.
 */
function paginated(res, { items, total, page, limit, ...rest }) {
  const safeLimit = Math.max(1, Number(limit) || 20);
  return res.status(200).json({
    success: true,
    data: items,
    pagination: {
      total,
      page: Number(page) || 1,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil((Number(total) || 0) / safeLimit)),
    },
    ...rest,
  });
}

module.exports = { ok, created, noContent, paginated };
