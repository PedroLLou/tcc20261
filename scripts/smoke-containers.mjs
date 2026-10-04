import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const [mode, baseUrl, envPath, statePath] = process.argv.slice(2);
assert.ok(['create', 'verify'].includes(mode), 'Modo esperado: create ou verify');
assert.ok(baseUrl && envPath && statePath, 'Informe URL, arquivo .env e arquivo de estado');
const env = parseEnv(readFileSync(envPath, 'utf8'));

async function request(path, { method = 'GET', body, token, status = 200 } = {}) {
  const response = await fetch(new URL(`/api/v1/${path}`, baseUrl), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, status, `${method} ${path}: status HTTP inesperado`);
  return response.json();
}

async function login(email, password) {
  // O controller atual usa o status padrão 201 do @Post do NestJS.
  const result = await request('auth/login', { method: 'POST', body: { email, password }, status: 201 });
  assert.equal(typeof result.access_token, 'string');
  assert.equal(result.email, email);
  return result;
}

async function checkFrontend() {
  const response = await fetch(new URL('/', baseUrl), { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/);
  const asset = html.match(/src="([^"]*\/static\/js\/[^"\s]+\.js)"/);
  assert.ok(asset, 'Build React não encontrado no HTML');
  const script = await fetch(new URL(asset[1], baseUrl), { method: 'HEAD', signal: AbortSignal.timeout(10000) });
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /javascript/);
  const direct = await fetch(new URL('/container-check/direct-navigation', baseUrl), { signal: AbortSignal.timeout(10000) });
  assert.equal(await direct.text(), html, 'Fallback SPA inválido');
  const missing = await fetch(new URL('/static/js/container-check-missing.js', baseUrl), { signal: AbortSignal.timeout(10000) });
  assert.equal(missing.status, 404, 'Arquivo estático ausente deve retornar 404');
}

try {
  await checkFrontend();
  await request('auth/users', { status: 401 });
  await request('auth/login', {
    method: 'POST', body: { email: 'missing@example.invalid', password: 'invalid' }, status: 401,
  });
  const admin = await login(env.DEFAULT_ADMIN_RH_EMAIL, env.DEFAULT_ADMIN_RH_PASSWORD);
  assert.equal(admin.role, 'ADMIN_RH');

  if (mode === 'create') {
    const suffix = randomBytes(8).toString('hex');
    const teamName = `Container ${suffix}`;
    const team = await request('auth/teams', {
      method: 'POST', body: { name: teamName }, token: admin.access_token, status: 201,
    });
    const password = randomBytes(32).toString('hex');
    const createUser = (role, label) => request('auth/users', {
      method: 'POST', token: admin.access_token, status: 201,
      body: { name: `Teste ${label}`, age: 30, email: `${label}.${suffix}@example.invalid`, password, role, teamId: team.id },
    });
    const leader = await createUser('ADMIN_LEADER', 'leader');
    const member = await createUser('TEAM_MEMBER', 'member');
    const leaderAuth = await login(leader.email, password);
    const memberAuth = await login(member.email, password);
    await request('auth/users', { token: memberAuth.access_token, status: 403 });
    const draft = await request('feedback-processes', {
      method: 'POST', token: leaderAuth.access_token, status: 201,
      body: {
        objective: 'Validar containers com dados sintéticos', participantId: member.id,
        startsAt: '2027-01-01T00:00:00.000Z', endsAt: '2027-02-01T00:00:00.000Z',
        criteria: ['Comunicação'],
      },
    });
    assert.equal(draft.status, 'DRAFT');
    const submitted = await request(`feedback-processes/${draft.id}/submit`, {
      method: 'POST', token: leaderAuth.access_token, status: 201,
    });
    assert.equal(submitted.status, 'SENT_FOR_VALIDATION');
    const approved = await request(`feedback-processes/${draft.id}/approve`, {
      method: 'POST', token: admin.access_token, status: 201,
    });
    assert.equal(approved.status, 'PLANNED');
    writeFileSync(statePath, JSON.stringify({ teamId: team.id, teamName, leaderId: leader.id, memberId: member.id, feedbackId: draft.id }), { flag: 'wx', mode: 0o600 });
    console.log('Frontend, proxy, login, permissões e fluxo de feedback passaram.');
  } else {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    const teams = await request('auth/teams');
    assert.ok(teams.some((team) => team.id === state.teamId && team.name === state.teamName));
    const users = await request('auth/users', { token: admin.access_token });
    assert.ok(users.some((user) => user.id === state.leaderId && user.teamId === state.teamId));
    assert.ok(users.some((user) => user.id === state.memberId && user.teamId === state.teamId));
    const feedback = await request(`feedback-processes/${state.feedbackId}`, { token: admin.access_token });
    assert.equal(feedback.status, 'PLANNED');
    assert.equal(feedback.ownerId, state.leaderId);
    assert.equal(feedback.participantId, state.memberId);
    console.log('Dados persistiram após recriar os containers.');
  }
} catch (error) {
  console.error(`Teste de integração falhou: ${error.message}`);
  process.exitCode = 1;
}
