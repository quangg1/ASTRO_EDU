const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, schemas, z } = require('../shared/http');
const { AppError, toErrorResponse } = require('../shared/errors');

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err));
  });
}

test('validate puts coerced data on req.valid and leaves req untouched on success', async () => {
  const req = { query: { page: '2', limit: '5' } };
  const err = await runMiddleware(validate({ query: schemas.pagination() }), req);

  assert.equal(err, undefined);
  assert.deepEqual(req.valid.query, { page: 2, limit: 5 });
});

test('validate applies schema defaults for missing query params', async () => {
  const req = { query: {} };
  await runMiddleware(validate({ query: schemas.pagination(20) }), req);

  assert.deepEqual(req.valid.query, { page: 1, limit: 20 });
});

test('validate reports field errors namespaced by source', async () => {
  const req = { params: { id: 'not-an-object-id' }, body: { title: '' } };
  const middleware = validate({
    params: z.object({ id: schemas.objectId }),
    body: z.object({ title: schemas.trimmedString(10, 'Tiêu đề') }),
  });

  const err = await runMiddleware(middleware, req);

  assert.ok(err instanceof AppError);
  assert.equal(err.status, 400);
  assert.equal(err.code, 'VALIDATION_ERROR');
  assert.ok(err.details['params.id']);
  assert.ok(err.details['body.title']);
});

test('validate replaces req.body with the parsed value', async () => {
  const req = { body: { name: '  Sao Hoả  ', extra: 'dropped' } };
  await runMiddleware(validate({ body: z.object({ name: z.string().trim() }) }), req);

  assert.deepEqual(req.body, { name: 'Sao Hoả' });
});

test('AppError factories carry the right status and stable code', () => {
  assert.equal(AppError.notFound().status, 404);
  assert.equal(AppError.forbidden().code, 'FORBIDDEN');
  assert.equal(AppError.conflict().status, 409);
});

test('toErrorResponse maps infrastructure errors to the shared envelope', () => {
  const duplicate = toErrorResponse({ code: 11000, keyValue: { slug: 'x' } });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, 'DUPLICATE_KEY');

  const cast = toErrorResponse({ name: 'CastError', path: '_id' });
  assert.equal(cast.status, 400);
  assert.equal(cast.body.code, 'INVALID_IDENTIFIER');

  const unknown = toErrorResponse(new Error('boom'));
  assert.equal(unknown.status, 500);
  assert.equal(unknown.body.error, 'Lỗi máy chủ');
  assert.equal(unknown.body.details, undefined);
});

test('unknown errors never leak their message to the client', () => {
  const { body } = toErrorResponse(new Error('mongodb://user:secret@host'));
  assert.ok(!JSON.stringify(body).includes('secret'));
});
