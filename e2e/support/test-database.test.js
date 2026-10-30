const test = require('node:test');
const assert = require('node:assert');
const { assertTestDatabase } = require('./test-database');

test('aceita banco local cujo nome termina em _test', () => {
  assert.doesNotThrow(() =>
    assertTestDatabase('postgresql://postgres:senha@localhost:5433/feedback_test'),
  );
  assert.doesNotThrow(() =>
    assertTestDatabase('postgresql://postgres:senha@127.0.0.1:5432/e2e_test'),
  );
});

test('recusa variável ausente ou inválida', () => {
  assert.throws(() => assertTestDatabase(undefined), /não está definida/);
  assert.throws(() => assertTestDatabase('isto-nao-e-url'), /não é uma URL válida/);
});

test('recusa banco cujo nome não termina em _test', () => {
  assert.throws(
    () => assertTestDatabase('postgresql://postgres:senha@localhost:5433/feedback'),
    /não aponta para um banco de teste/,
  );
});

test('recusa host que não é local, mesmo com nome _test', () => {
  assert.throws(
    () => assertTestDatabase('postgresql://u:s@ep-nuvem.neon.tech/feedback_test'),
    /não aponta para um banco de teste/,
  );
});
