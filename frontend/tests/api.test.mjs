import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
// O bundle CJS de navegador exercita Axios sem dependências HTTP de Node.
const axios = require(join(dirname(require.resolve('axios/package.json')), 'dist/browser/axios.cjs'));
const sources = fileURLToPath(new URL('../src/services/', import.meta.url));

function loadClients(baseUrl) {
  const modules = new Map();
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  function load(name) {
    if (name === 'axios') return axios;
    if (modules.has(name)) return modules.get(name);
    const module = { exports: {} };
    modules.set(name, module.exports);
    const source = readFileSync(join(sources, `${name.replace('./', '')}.ts`), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
    });
    runInNewContext(outputText, {
      module, exports: module.exports, require: load, localStorage,
      process: { env: baseUrl ? { REACT_APP_API_URL: baseUrl } : {} },
    }, { filename: `${name}.ts` });
    return module.exports;
  }
  return {
    api: load('./api').default,
    auth: load('./authService').default,
    feedback: load('./feedbackProcessService').default,
    storage,
  };
}

for (const [configuration, baseUrl, expectedPrefix] of [
  ['container relativo', '/api/v1', '/api/v1'],
  ['API externa', 'https://demo.example.invalid/api/v1', 'https://demo.example.invalid/api/v1'],
  ['desenvolvimento local', undefined, 'http://localhost:3001/api/v1'],
]) {
  test(`autenticação e feedback usam um único prefixo em ${configuration}`, async () => {
    const requests = [];
    const oldAdapter = axios.defaults.adapter;
    const user = { id: 1, email: 'test@example.invalid', name: 'Teste', role: 'ADMIN_RH', access_token: 'test-token' };
    // Substituir somente o transporte: criação de clientes, URLs e interceptors são reais.
    axios.defaults.adapter = async (config) => {
      requests.push({ url: axios.getUri(config), authorization: config.headers.get('Authorization') });
      return { data: config.url.endsWith('/login') ? user : [], status: 200, statusText: 'OK', headers: {}, config };
    };
    try {
      const { auth, feedback, storage } = loadClients(baseUrl);
      assert.deepEqual(await auth.listTeams(), []);
      assert.equal((await auth.login({ email: user.email, password: 'synthetic-password' })).email, user.email);
      await feedback.list();
      assert.deepEqual(requests.map((request) => request.url), [
        `${expectedPrefix}/auth/teams`, `${expectedPrefix}/auth/login`, `${expectedPrefix}/feedback-processes`,
      ]);
      assert.equal(requests[2].authorization, 'Bearer test-token');
      auth.logout();
      assert.equal(storage.has('auth_token'), false);
    } finally {
      axios.defaults.adapter = oldAdapter;
    }
  });
}
