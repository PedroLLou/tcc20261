import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { test } from 'node:test';

const script = new URL('../scripts/create-container-env.mjs', import.meta.url);

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'tcc-env-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return join(directory, '.env');
}

function generate(path) {
  return spawnSync(process.execPath, [script.pathname, path], { encoding: 'utf8' });
}

test('generates private credentials and a matching database URL without printing secrets', (t) => {
  const path = fixture(t);
  const result = generate(path);
  assert.equal(result.status, 0, result.stderr);
  const env = parseEnv(readFileSync(path, 'utf8'));
  const url = new URL(env.DATABASE_URL);
  assert.equal(url.hostname, 'db');
  assert.equal(decodeURIComponent(url.username), env.POSTGRES_USER);
  assert.equal(decodeURIComponent(url.password), env.POSTGRES_PASSWORD);
  assert.equal(url.pathname, `/${env.POSTGRES_DB}`);
  assert.equal(url.searchParams.get('schema'), 'public');
  assert.equal(env.DEFAULT_ADMIN_RH_EMAIL, 'admin@example.invalid');
  for (const key of ['JWT_SECRET', 'POSTGRES_PASSWORD', 'DEFAULT_ADMIN_RH_PASSWORD']) {
    assert.match(env[key], /^[a-f0-9]{64}$/);
    assert.ok(!result.stdout.includes(env[key]));
    assert.ok(!result.stderr.includes(env[key]));
  }
  assert.equal(statSync(path).mode & 0o777, 0o600);
});

test('refuses to overwrite existing credentials', (t) => {
  const path = fixture(t);
  assert.equal(generate(path).status, 0);
  const before = readFileSync(path, 'utf8');
  assert.notEqual(generate(path).status, 0);
  assert.equal(readFileSync(path, 'utf8'), before);
});

test('generates independent secrets for each environment', (t) => {
  const first = fixture(t);
  const second = fixture(t);
  assert.equal(generate(first).status, 0);
  assert.equal(generate(second).status, 0);
  const a = parseEnv(readFileSync(first, 'utf8'));
  const b = parseEnv(readFileSync(second, 'utf8'));
  for (const key of ['JWT_SECRET', 'POSTGRES_PASSWORD', 'DEFAULT_ADMIN_RH_PASSWORD']) {
    assert.notEqual(a[key], b[key]);
  }
  assert.notEqual(a.JWT_SECRET, a.POSTGRES_PASSWORD);
  assert.notEqual(a.JWT_SECRET, a.DEFAULT_ADMIN_RH_PASSWORD);
});
