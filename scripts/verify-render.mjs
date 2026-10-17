import assert from 'node:assert/strict';
import { defaultConfigPath, loadPrivateConfig, publicOrigin, RenderConfigError } from './render-config.mjs';

let stage = 'CONFIGURATION';
try {
  const config = loadPrivateConfig(process.argv[2] ?? defaultConfigPath,
    ['API_URL', 'FRONTEND_URL', 'DEFAULT_ADMIN_RH_EMAIL', 'DEFAULT_ADMIN_RH_PASSWORD']);
  const api = publicOrigin(config.API_URL);
  const frontend = publicOrigin(config.FRONTEND_URL);
  const request = (origin, path, options = {}) => fetch(new URL(path, origin), {
    ...options, redirect: 'error', signal: AbortSignal.timeout(120000),
  });
  stage = 'FRONTEND_HTML';
  const response = await request(frontend, '/');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/);
  const asset = html.match(/src="([^"]*\/static\/js\/[^"\s]+\.js)"/);
  assert.ok(asset);
  const assetUrl = new URL(asset[1], frontend);
  assert.equal(assetUrl.origin, frontend);
  stage = 'FRONTEND_JAVASCRIPT';
  const javascript = await request(frontend, assetUrl.pathname, { method: 'HEAD' });
  assert.equal(javascript.status, 200);
  assert.match(javascript.headers.get('content-type'), /javascript/);
  stage = 'FRONTEND_SPA';
  const deep = await request(frontend, '/render-check/direct-navigation');
  assert.equal(deep.status, 200);
  assert.equal(await deep.text(), html);
  stage = 'API_READINESS';
  assert.equal((await request(api, '/api/v1/health/ready')).status, 200);
  stage = 'API_PUBLIC_ROUTE';
  assert.equal((await request(api, '/api/v1/auth/teams')).status, 200);
  stage = 'AUTH_REQUIRED';
  assert.equal((await request(api, '/api/v1/auth/users')).status, 401);
  stage = 'CORS_PREFLIGHT';
  const preflight = await request(api, '/api/v1/auth/login', {
    method: 'OPTIONS', headers: { Origin: frontend, 'Access-Control-Request-Method': 'POST' },
  });
  assert.ok(preflight.status >= 200 && preflight.status < 300);
  assert.equal(preflight.headers.get('access-control-allow-origin'), frontend);
  stage = 'ADMIN_LOGIN';
  const login = await request(api, '/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: frontend },
    body: JSON.stringify({ email: config.DEFAULT_ADMIN_RH_EMAIL, password: config.DEFAULT_ADMIN_RH_PASSWORD }),
  });
  assert.equal(login.status, 201);
  const user = await login.json();
  assert.equal(user.role, 'ADMIN_RH');
  assert.equal(typeof user.access_token, 'string');
  console.log('HTML, JavaScript, SPA, readiness, API, CORS, autenticação e bloqueio sem token passaram.');
  console.log('Este teste HTTP não comprova interação de navegador, carga ou telemetria remota.');
} catch (error) {
  // Nunca imprimir corpos, URLs de configuração, tokens ou erros de transporte.
  console.error(error instanceof RenderConfigError
    ? error.message
    : `A verificação pública falhou na etapa ${stage} (${error instanceof assert.AssertionError
      ? 'PUBLIC_HTTP_ASSERTION_FAILED' : 'PUBLIC_HTTP_REQUEST_FAILED'}).`);
  process.exitCode = 1;
}
