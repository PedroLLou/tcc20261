import assert from 'node:assert/strict';
import { chmodSync, closeSync, fstatSync, mkdtempSync, openSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const execute = (script, path, env = process.env) => spawnSync(process.execPath,
  [join(root, 'scripts', script), path], { encoding: 'utf8', env, timeout: 10000 });
const fixture = (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'tcc-render-helper-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return join(directory, '.env.render');
};
const readFixture = (path) => {
  const descriptor = openSync(path, 'r');
  try {
    return { content: readFileSync(descriptor, 'utf8'), mode: fstatSync(descriptor).mode };
  } finally {
    closeSync(descriptor);
  }
};

test('creates private independent cloud credentials and preserves an existing configuration', (t) => {
  const path = fixture(t);
  const result = execute('create-render-env.mjs', path);
  assert.equal(result.status, 0, 'Cloud configuration generation failed');
  const { content: before, mode } = readFixture(path);
  const config = parseEnv(before);
  assert.equal(mode & 0o777, 0o600);
  assert.equal(config.DATABASE_URL, '');
  assert.equal(config.RENDER_API_KEY, '');
  assert.equal(config.NEON_API_KEY, '');
  assert.match(config.JWT_SECRET, /^[a-f0-9]{64}$/);
  assert.match(config.DEFAULT_ADMIN_RH_PASSWORD, /^[a-f0-9]{64}$/);
  assert.notEqual(config.JWT_SECRET, config.DEFAULT_ADMIN_RH_PASSWORD);
  assert.ok(!result.stdout.includes(config.JWT_SECRET));
  assert.ok(!result.stdout.includes(config.DEFAULT_ADMIN_RH_PASSWORD));
  assert.notEqual(execute('create-render-env.mjs', path).status, 0);
  assert.equal(readFixture(path).content, before);
});

test('refuses insecure migration configuration before starting the engine and without exposing values', (t) => {
  const path = fixture(t);
  const marker = 'CONFIG_SECRET_CANARY';
  writeFileSync(path, `DATABASE_URL=postgresql://user:${marker}@db:5432/tcc\n`, { mode: 0o600 });
  const result = execute('render-migrate.mjs', path, { ...process.env, PATH: '/path/without/commands' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TLS/);
  assert.ok(!result.stderr.includes(marker));
  assert.ok(!result.stdout.includes(marker));
});

test('rejects configuration readable by other users', (t) => {
  const path = fixture(t);
  writeFileSync(path, 'DATABASE_URL=postgresql://user:CONFIG_SECRET_CANARY@db.example.invalid/db?sslmode=require\n', { mode: 0o600 });
  chmodSync(path, 0o644);
  const result = execute('render-migrate.mjs', path, { ...process.env, PATH: '/path/without/commands' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /0600/);
  assert.ok(!result.stderr.includes('CONFIG_SECRET_CANARY'));
});

test('rejects a symlink without reading private configuration', { skip: process.platform === 'win32' }, (t) => {
  const path = fixture(t);
  const target = path + '.target';
  writeFileSync(target, 'DATABASE_URL=CONFIG_SECRET_CANARY\n', { mode: 0o600 });
  symlinkSync(target, path);
  const result = execute('render-migrate.mjs', path);
  assert.notEqual(result.status, 0);
  assert.equal(result.error, undefined);
  assert.match(result.stderr, /Configuração privada não encontrada/);
  assert.ok(!result.stderr.includes('CONFIG_SECRET_CANARY'));
});

test('rejects a FIFO without waiting for a writer', { skip: process.platform !== 'linux' }, (t) => {
  const path = fixture(t);
  assert.equal(spawnSync('mkfifo', ['-m', '600', path]).status, 0);
  const result = execute('render-migrate.mjs', path);
  assert.equal(result.error, undefined, 'A non-regular file must not block until the test timeout');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /arquivo regular/);
});

test('refuses public URL credentials without issuing an HTTP request', (t) => {
  const path = fixture(t);
  writeFileSync(path, 'API_URL=https://user:CONFIG_SECRET_CANARY@api.example.invalid\nFRONTEND_URL=https://frontend.example.invalid\nDEFAULT_ADMIN_RH_EMAIL=admin@example.invalid\nDEFAULT_ADMIN_RH_PASSWORD=CONFIG_PASSWORD_CANARY\n', { mode: 0o600 });
  const result = execute('verify-render.mjs', path);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HTTPS/);
  assert.ok(!result.stderr.includes('CONFIG_SECRET_CANARY'));
  assert.ok(!result.stderr.includes('CONFIG_PASSWORD_CANARY'));
});
