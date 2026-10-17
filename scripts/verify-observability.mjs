#!/usr/bin/env node
// Host: node scripts/verify-observability.mjs [--skip-build]
// Local receiver: node /verify/verify-observability.mjs receiver /capture
// No remote account is used. Raw telemetry and credentials live only in a 0700 temp directory.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createConnection, createServer as createNetServer } from 'node:net';
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { gunzipSync } from 'node:zlib';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const metricAttributes = new Set(['http.request.method', 'http.route', 'http.response.status_code']);
const knownRoutes = new Set([
  '/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/teams', '/api/v1/auth/teams/:id',
  '/api/v1/auth/users', '/api/v1/auth/users/:id', '/api/v1/feedback-processes',
  '/api/v1/feedback-processes/:id', '/api/v1/feedback-processes/:id/submit',
  '/api/v1/feedback-processes/:id/approve', '/api/v1/feedback-processes/:id/observation',
]);
const logFields = new Set(['level', 'time', 'event', 'request_id', 'trace_id', 'span_id', 'method', 'route', 'status_code', 'duration_ms', 'code', 'release']);
const fail = (code) => { throw new Error(code); };
const check = (condition, code) => { if (!condition) fail(code); };
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const secret = () => randomBytes(20).toString('hex');

export function containerLookupArgs(engine, project, service) {
  // podman-compose 1.6 does not accept `ps SERVICE`. Both engines support these Compose labels.
  return [engine, 'ps', '--all', '--quiet', '--filter', `label=com.docker.compose.project=${project}`,
    '--filter', `label=com.docker.compose.service=${service}`];
}

export function attributes(values = []) {
  return Object.fromEntries(values.map(({ key, value }) => [key,
    value.stringValue ?? (value.intValue !== undefined ? Number(value.intValue) : value.doubleValue ?? value.boolValue),
  ]));
}

export function assertPrivate(rawSignals, canaries) {
  for (const raw of rawSignals) {
    let decoded = raw;
    try { decoded += JSON.stringify(JSON.parse(raw)); } catch { /* stdout has one JSON object per line */ }
    for (const { label, value } of canaries) {
      if (value && decoded.includes(value)) fail(`PRIVACY_CANARY_${label.toUpperCase().replaceAll(/[^A-Z0-9_]/g, '_')}`);
    }
  }
}

export function flattenSpans(payloads) {
  return payloads.flatMap((payload) => (payload.resourceSpans ?? []).flatMap((resource) =>
    (resource.scopeSpans ?? []).flatMap((scope) => scope.spans ?? [])));
}

export function assertTelemetryShape(payloads) {
  const resources = new Set(['service.name', 'deployment.environment.name', 'service.version']);
  const names = new Set(['http.request', 'express.request', 'nestjs.handler', 'prisma.operation', 'operation', 'auth.verify_password', 'feedback.create', 'feedback.submit_for_validation']);
  for (const payload of payloads) {
    for (const resource of [...(payload.resourceSpans ?? []), ...(payload.resourceMetrics ?? [])]) {
      check((resource.resource?.attributes ?? []).every((attribute) => resources.has(attribute.key)), 'RESOURCE_ALLOWLIST');
      check(attributes(resource.resource?.attributes)['service.name'] === 'tcc20261-api', 'RESOURCE_SERVICE_NAME');
      for (const scope of resource.scopeSpans ?? []) for (const span of scope.spans ?? []) {
        check(names.has(span.name), 'SPAN_NAME_ALLOWLIST');
        check((span.attributes ?? []).every((attribute) => metricAttributes.has(attribute.key)), 'SPAN_ATTRIBUTE_ALLOWLIST');
        check(!(span.events?.length || span.links?.length || span.status?.message), 'SPAN_ERROR_OR_EVENT_CONTENT');
      }
      for (const scope of resource.scopeMetrics ?? []) for (const metric of scope.metrics ?? []) {
        check(metric.name.startsWith('tcc.http.') || metric.name.startsWith('tcc.process.'), 'METRIC_NAME_ALLOWLIST');
        for (const point of (metric.sum ?? metric.histogram ?? metric.gauge)?.dataPoints ?? []) {
          check((point.attributes ?? []).every((attribute) => metricAttributes.has(attribute.key)), 'METRIC_ATTRIBUTE_ALLOWLIST');
          for (const exemplar of point.exemplars ?? []) check(!(exemplar.filteredAttributes?.length), 'METRIC_EXEMPLAR_ATTRIBUTES');
        }
      }
    }
  }
}

function flattenMetrics(payload) {
  return (payload?.resourceMetrics ?? []).flatMap((resource) =>
    (resource.scopeMetrics ?? []).flatMap((scope) => scope.metrics ?? []));
}

function metricKey(method, route, status) { return JSON.stringify([method, route, Number(status)]); }

function valuesFor(payload, name) {
  const metric = flattenMetrics(payload).find((item) => item.name === name);
  check(metric, `METRIC_MISSING_${name.replaceAll('.', '_')}`);
  const data = metric.sum ?? metric.histogram;
  check(data && Number(data.aggregationTemporality) === 2, 'METRIC_TEMPORALITY');
  check(metric.unit === (name.endsWith('duration') ? 's' : '{request}'), 'METRIC_UNIT');
  const result = new Map();
  for (const point of data.dataPoints ?? []) {
    const attr = attributes(point.attributes);
    check(Object.keys(attr).length === 3 && Object.keys(attr).every((key) => metricAttributes.has(key)), 'METRIC_ATTRIBUTE');
    check(typeof attr['http.route'] === 'string' && !/[?]|(?:^|\/)\d+(?:\/|$)/.test(attr['http.route']), 'METRIC_ROUTE');
    const key = metricKey(attr['http.request.method'], attr['http.route'], attr['http.response.status_code']);
    check(!result.has(key), 'METRIC_DUPLICATE_SERIES');
    const count = Number(name.endsWith('duration') ? point.count : point.asDouble ?? point.asInt);
    check(Number.isFinite(count) && count >= 0, 'METRIC_VALUE');
    result.set(key, count);
  }
  return result;
}

export function assertRequestMetrics(before, after, logs) {
  const expected = new Map();
  for (const log of logs) {
    const key = metricKey(log.method, log.route, log.status_code);
    expected.set(key, (expected.get(key) ?? 0) + 1);
  }
  for (const [name, error] of [['tcc.http.request.count', 'METRIC_COUNT_MISMATCH'], ['tcc.http.request.duration', 'METRIC_DURATION_MISMATCH']]) {
    const previous = valuesFor(before, name);
    const current = valuesFor(after, name);
    for (const key of new Set([...previous.keys(), ...current.keys(), ...expected.keys()])) {
      check((current.get(key) ?? 0) - (previous.get(key) ?? 0) === (expected.get(key) ?? 0), error);
    }
  }
  check(flattenMetrics(after).some((metric) => metric.name.startsWith('tcc.process.')), 'PROCESS_METRICS_MISSING');
  return logs.length;
}

export function assertTraceHierarchy(spans, log, manualNames, requirePrisma = false) {
  const trace = spans.filter((span) => span.traceId.toLowerCase() === log.trace_id?.toLowerCase());
  const server = trace.find((span) => Number(span.kind) === 2 && span.spanId.toLowerCase() === log.span_id?.toLowerCase());
  check(server, 'TRACE_LOG_CORRELATION');
  const byId = new Map(trace.map((span) => [span.spanId.toLowerCase(), span]));
  const descendant = (span) => {
    const seen = new Set();
    while (span?.parentSpanId) {
      const parent = span.parentSpanId.toLowerCase();
      if (parent === server.spanId.toLowerCase()) return true;
      if (seen.has(parent)) return false;
      seen.add(parent);
      span = byId.get(parent);
    }
    return false;
  };
  for (const name of manualNames) {
    check(trace.some((span) => span.name === name && descendant(span)), 'TRACE_MANUAL_PARENT');
  }
  if (requirePrisma) check(trace.some((span) => /^prisma[:.]/i.test(span.name) && descendant(span)), 'TRACE_PRISMA_MISSING');
}

export async function startReceiver(directory, port = 4318, host = '0.0.0.0') {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  let sequence = 0;
  const server = createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/ready') { response.writeHead(200).end('{}'); return; }
    const signal = /^\/v1\/(traces|metrics)$/.exec(request.url ?? '')?.[1];
    if (request.method !== 'POST' || !signal || !request.headers['content-type']?.startsWith('application/json')) {
      response.writeHead(415).end(); return;
    }
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        check(size <= 8 * 1024 * 1024, 'RECEIVER_TOO_LARGE');
        chunks.push(chunk);
      }
      let body = Buffer.concat(chunks);
      if (request.headers['content-encoding'] === 'gzip') body = gunzipSync(body, { maxOutputLength: 8 * 1024 * 1024 });
      const parsed = JSON.parse(body.toString('utf8'));
      check(Array.isArray(parsed[signal === 'traces' ? 'resourceSpans' : 'resourceMetrics']), 'RECEIVER_SCHEMA');
      const path = join(directory, `${String(++sequence).padStart(8, '0')}-${signal}.json`);
      await writeFile(`${path}.pending`, body, { flag: 'wx', mode: 0o600 });
      await rename(`${path}.pending`, path);
      response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    } catch { response.writeHead(400, { 'Content-Type': 'application/json' }).end('{}'); }
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(port, host, done); });
  return server;
}

async function availablePort() {
  const server = createNetServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}

async function runVerification() {
  const engine = process.env.CONTAINER_ENGINE ?? 'podman';
  check(['podman', 'docker'].includes(engine), 'CONTAINER_ENGINE_INVALID');
  const skipBuild = process.argv.includes('--skip-build');
  check(process.argv.slice(2).every((arg) => arg === '--skip-build'), 'ARGUMENT_INVALID');
  const directory = await mkdtemp(join(tmpdir(), 'tcc-observability-'));
  const captureDirectory = join(directory, 'capture');
  await mkdir(captureDirectory, { mode: 0o700 });
  const project = `tcc-observe-${Date.now()}-${process.pid}`;
  const envPath = join(directory, '.env');
  const overridePath = join(directory, 'compose.json');
  const apiPort = Number(process.env.TEST_TELEMETRY_API_PORT ?? await availablePort());
  const webPort = Number(process.env.TEST_TELEMETRY_WEB_PORT ?? await availablePort());
  const baseUrl = `http://127.0.0.1:${apiPort}`;
  let commandNumber = 0;
  let composeReady = false;
  let interrupted = false;
  let activeCommand;
  const interrupt = () => { interrupted = true; activeCommand?.kill('SIGTERM'); };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  const canaries = [];
  const remember = (label, value) => { canaries.push({ label, value }); return value; };
  const marker = (label) => remember(label, `tcc_canary_${label}_${secret()}`);
  const password = marker('password');
  const email = remember('email', `canary.${secret()}@example.invalid`);
  const feedback = marker('feedback');
  const description = marker('description');
  const cookie = marker('cookie');
  const query = marker('query');
  const rawError = marker('error');
  const invalidToken = marker('invalid_token');
  const callerId = marker('caller_request_id');
  const exporterHeader = marker('exporter_header');
  const incomingTraces = new Set();
  const expectedResponses = new Map();
  const summary = { local_only: true, sampling: {}, scenarios: [], remote_ingestion: 'not_tested', benchmark: 'not_tested' };

  async function run(args, { input, optional = false, timeout = 180000 } = {}) {
    if (interrupted && !optional) fail('VERIFICATION_INTERRUPTED');
    const result = await new Promise((done) => {
      const child = spawn(args[0], args.slice(1), { cwd: root, env: { ...process.env, WEB_PORT: String(webPort) }, stdio: ['pipe', 'pipe', 'pipe'] });
      activeCommand = child;
      let stdout = '', stderr = '', timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', () => { clearTimeout(timer); done({ code: 127, stdout, stderr }); });
      child.on('close', (code) => { clearTimeout(timer); activeCommand = undefined; done({ code: timedOut ? 124 : code, stdout, stderr }); });
      child.stdin.end(input);
    });
    await writeFile(join(directory, `command-${++commandNumber}.log`), result.stdout + result.stderr, { mode: 0o600 });
    if (!optional && result.code !== 0) fail(`COMMAND_FAILED_${commandNumber}_EXIT_${result.code}`);
    return result;
  }
  const compose = (...args) => [engine, 'compose', '--env-file', envPath, '-f', join(root, 'compose.yaml'), '-f', overridePath, '-p', project, ...args];
  let sampleRate = '1';
  let exporterEndpoint = 'http://collector:4318';
  async function configuration() {
    const services = {
      api: {
        ...(skipBuild ? {} : { image: `localhost/${project}-api:local` }),
        ports: [`127.0.0.1:${apiPort}:3001`],
        healthcheck: { disable: true },
        restart: 'no',
        environment: {
          OTEL_SDK_DISABLED: 'false', OTEL_EXPORTER_OTLP_ENDPOINT: exporterEndpoint,
          OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json', OTEL_TRACES_SAMPLER_ARG: sampleRate,
          OTEL_METRIC_EXPORT_INTERVAL: '1000', OTEL_BSP_SCHEDULE_DELAY: '500',
          OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: 'cumulative',
          OTEL_EXPORTER_OTLP_TIMEOUT: '1000', OTEL_EXPORTER_OTLP_HEADERS: `x-verification-secret=${exporterHeader}`,
          OTEL_SERVICE_NAME: 'tcc20261-api', APP_RELEASE: '0592e65905ad7212ac1119c5554406a97ef1a5c2',
        },
        depends_on: { collector: { condition: 'service_started' } },
      },
      frontend: { ...(skipBuild ? {} : { image: `localhost/${project}-frontend:local` }), depends_on: { api: { condition: 'service_started' } } },
      migrate: { ...(skipBuild ? {} : { image: `localhost/${project}-migrate:local` }) },
      collector: {
        image: 'docker.io/library/node:24-bookworm-slim',
        command: ['node', '/verify/verify-observability.mjs', 'receiver', '/capture'],
        volumes: [`${fileURLToPath(import.meta.url)}:/verify/verify-observability.mjs:ro`, `${captureDirectory}:/capture`],
        restart: 'no',
      },
    };
    await writeFile(overridePath, JSON.stringify({ services }), { mode: 0o600 });
  }

  async function captures() {
    const names = (await readdir(captureDirectory)).filter((name) => /^\d{8}-(traces|metrics)\.json$/.test(name)).sort();
    return Promise.all(names.map(async (name) => ({ name, raw: await readFile(join(captureDirectory, name), 'utf8') })));
  }
  async function latestMetrics() {
    const files = await captures();
    const last = files.filter((file) => file.name.endsWith('-metrics.json')).at(-1);
    return last && JSON.parse(last.raw);
  }
  async function waitFor(fn, code, timeout = 20000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (interrupted) fail('VERIFICATION_INTERRUPTED');
      const result = await fn();
      if (result) return result;
      await delay(200);
    }
    fail(code);
  }
  async function apiLogs(existingContainer) {
    const container = existingContainer ?? (await run(containerLookupArgs(engine, project, 'api'))).stdout.trim();
    check(container && /^[a-z0-9]+$/i.test(container), 'API_CONTAINER_ID');
    const result = await run([engine, 'logs', container]);
    const raw = result.stdout + result.stderr;
    assertPrivate(raw.split('\n'), canaries);
    const lines = raw.split('\n').filter((line) => line.trim());
    const logs = lines.map((line) => { try { return JSON.parse(line); } catch { fail('STDOUT_NOT_JSON'); } });
    check(logs.every((log) => Object.keys(log).every((key) => logFields.has(key))), 'STDOUT_ALLOWLIST');
    return { raw, logs, completed: logs.filter((log) => log.event === 'http.request.completed') };
  }
  async function ready() {
    await waitFor(async () => {
      try { return (await fetch(`${baseUrl}/api/v1/auth/teams`, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
    }, 'API_NOT_READY', 120000);
    // Wait beyond one full reader interval, with no HTTP probes in the measured window.
    await delay(1400);
    return waitFor(async () => {
      const data = await latestMetrics();
      return data && flattenMetrics(data).some((metric) => metric.name === 'tcc.http.request.count') && data;
    }, 'OTLP_METRICS_NOT_RECEIVED');
  }
  async function request(path, { method = 'GET', body, token, status = 200, flag = '01' } = {}) {
    const upstream = secret().slice(0, 32);
    incomingTraces.add(upstream);
    const response = await fetch(`${baseUrl}/api/v1/${path}${path.includes('?') ? '&' : '?'}synthetic=${query}`, {
      method,
      headers: {
        Cookie: `verification=${cookie}`, 'X-Request-Id': callerId,
        traceparent: `00-${upstream}-${secret().slice(0, 16)}-${flag}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    check(response.status === status, `HTTP_STATUS_${method}_${status}`);
    const id = response.headers.get('x-request-id');
    check(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id ?? ''), 'REQUEST_ID_NOT_SERVER_UUID');
    let json;
    try { json = JSON.parse(text); } catch { fail('HTTP_RESPONSE_NOT_JSON'); }
    if (json.access_token) remember('access_token', json.access_token);
    const template = `/api/v1/${path.split('?')[0]}`.replaceAll(/\/\d+(?=\/|$)/g, '/:id');
    expectedResponses.set(id, { method, route: knownRoutes.has(template) ? template : '/unknown', status });
    return { json, id };
  }
  async function abortedRequest() {
    await new Promise((done, reject) => {
      const socket = createConnection({ host: '127.0.0.1', port: apiPort });
      socket.once('error', reject);
      socket.once('connect', () => {
        socket.write(`POST /api/v1/auth/login?synthetic=${query} HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 100000\r\nCookie: verification=${cookie}\r\n\r\n{"password":"${password}`);
        setTimeout(() => { socket.destroy(); done(); }, 200);
      });
    });
  }
  async function db(sql) {
    const config = parseEnv(await readFile(envPath, 'utf8'));
    return run(compose('exec', '-T', 'db', 'psql', '-U', config.POSTGRES_USER, '-d', config.POSTGRES_DB, '-v', 'ON_ERROR_STOP=1', '-At'), { input: sql });
  }
  async function installError() {
    // This trigger exists only in this verifier's new database and is removed in finally.
    await db(`CREATE FUNCTION observability_synthetic_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '${rawError}'; END; $$;
CREATE TRIGGER observability_synthetic_failure BEFORE INSERT ON "Team" FOR EACH ROW EXECUTE FUNCTION observability_synthetic_failure();`);
  }
  async function removeError() {
    await db('DROP TRIGGER IF EXISTS observability_synthetic_failure ON "Team"; DROP FUNCTION IF EXISTS observability_synthetic_failure();');
  }
  async function collectMeasured(before, initialLogs, ids, expectedCount, { manual = [], requirePrisma = false } = {}) {
    const logs = await waitFor(async () => {
      const all = (await apiLogs()).completed.slice(initialLogs);
      return all.length >= expectedCount && all;
    }, 'COMPLETION_LOGS_MISSING');
    check(logs.length === expectedCount, 'COMPLETION_LOG_DUPLICATES');
    check(new Set(logs.map((log) => log.request_id)).size === expectedCount, 'COMPLETION_REQUEST_ID_DUPLICATES');
    for (const id of ids) {
      const associated = logs.filter((log) => log.request_id === id);
      check(associated.length === 1, 'REQUEST_LOG_CORRELATION');
      const expected = expectedResponses.get(id);
      check(associated[0].method === expected.method && associated[0].route === expected.route && associated[0].status_code === expected.status, 'REQUEST_LOG_ROUTE_OR_STATUS');
    }
    for (const log of logs) {
      check(Number.isFinite(log.duration_ms) && log.duration_ms >= 0, 'LOG_DURATION');
      check(!incomingTraces.has(log.trace_id), 'CALLER_TRACE_TRUSTED');
      check(typeof log.route === 'string' && !/[?]/.test(log.route), 'LOG_ROUTE');
      check(!Object.keys(log).some((key) => /^(req|res|err|error|headers|body|user|stack)$/i.test(key)), 'LOG_ALLOWLIST');
      check(/^[a-f0-9]{32}$/i.test(log.trace_id ?? '') && /^[a-f0-9]{16}$/i.test(log.span_id ?? ''), 'LOG_TRACE_IDS_MISSING');
    }
    await waitFor(async () => {
      const current = await latestMetrics();
      try { assertRequestMetrics(before, current, logs); return current; } catch { return false; }
    }, 'METRIC_COMPLETENESS');
    await delay(800);
    const files = await captures();
    assertPrivate(files.map((file) => file.raw), canaries);
    assertTelemetryShape(files.map((file) => JSON.parse(file.raw)));
    const spans = flattenSpans(files.filter((file) => file.name.endsWith('-traces.json')).map((file) => JSON.parse(file.raw)));
    if (requirePrisma) for (const log of logs) {
      assertTraceHierarchy(spans, log, []);
      const rootSpans = spans.filter((span) => span.traceId === log.trace_id && Number(span.kind) === 2);
      check(rootSpans.length === 1, 'TRACE_HTTP_DUPLICATES');
      check(!rootSpans[0].parentSpanId || /^0+$/.test(rootSpans[0].parentSpanId), 'TRACE_CALLER_PARENT_TRUSTED');
      for (const span of spans.filter((item) => item.traceId === log.trace_id)) {
        check(BigInt(span.endTimeUnixNano ?? 0) >= BigInt(span.startTimeUnixNano ?? 1), 'TRACE_NOT_ENDED');
      }
    }
    for (const [id, names] of manual) assertTraceHierarchy(spans, logs.find((log) => log.request_id === id), names, requirePrisma);
    return { logs, spans };
  }

  try {
    console.log('Verificando telemetria local em ambiente isolado; saídas brutas permanecem privadas.');
    await run([engine, 'info']);
    await run([engine, 'compose', 'version']);
    await run([process.execPath, join(root, 'scripts/create-container-env.mjs'), envPath]);
    const config = parseEnv(await readFile(envPath, 'utf8'));
    for (const key of ['POSTGRES_PASSWORD', 'DATABASE_URL', 'JWT_SECRET', 'DEFAULT_ADMIN_RH_EMAIL', 'DEFAULT_ADMIN_RH_PASSWORD']) remember(key.toLowerCase(), config[key]);
    await configuration();
    await run(compose('config'));
    composeReady = true;
    if (!skipBuild) await run(compose('build'), { timeout: 900000 });
    await run(compose('up', '-d'));
    await ready();
    await run([process.execPath, join(root, 'scripts/smoke-containers.mjs'), 'create', `http://127.0.0.1:${webPort}`, envPath, join(directory, 'state.json')]);
    // Seed the canary users and prove the complete feedback path with 100% sampling.
    const admin = (await request('auth/login', { method: 'POST', body: { email: config.DEFAULT_ADMIN_RH_EMAIL, password: config.DEFAULT_ADMIN_RH_PASSWORD }, status: 201 })).json;
    const team = (await request('auth/teams', { method: 'POST', body: { name: marker('team_name') }, token: admin.access_token, status: 201 })).json;
    const users = {};
    for (const [name, role] of [['leader', 'ADMIN_LEADER'], ['member', 'TEAM_MEMBER']]) {
      const userEmail = remember(`${name}_email`, `${name}.${email}`);
      users[name] = (await request('auth/users', { method: 'POST', body: { name: marker(`${name}_name`), age: 30, email: userEmail, password, role, teamId: team.id }, token: admin.access_token, status: 201 })).json;
    }
    const hashes = (await db('SELECT password FROM "User";')).stdout.trim().split('\n');
    for (const hash of hashes) if (hash) remember('password_hash', hash);
    await delay(1400);
    const before = await latestMetrics();
    const initialLogs = (await apiLogs()).completed.length;
    const ids = [];
    const measured = async (...args) => { const result = await request(...args); ids.push(result.id); return result; };
    const leaderLogin = await measured('auth/login', { method: 'POST', body: { email: users.leader.email, password }, status: 201 });
    const memberLogin = await measured('auth/login', { method: 'POST', body: { email: users.member.email, password }, status: 201 });
    const draft = await measured('feedback-processes', { method: 'POST', token: leaderLogin.json.access_token, status: 201, body: {
      objective: feedback, description, participantId: users.member.id, criteria: [marker('criteria')],
      startsAt: '2027-01-01T00:00:00.000Z', endsAt: '2027-02-01T00:00:00.000Z',
    } });
    await measured(`feedback-processes/${draft.json.id}`, { method: 'PATCH', token: admin.access_token, body: { description: marker('edited_description') } });
    const submitted = await measured(`feedback-processes/${draft.json.id}/submit`, { method: 'POST', token: leaderLogin.json.access_token, status: 201 });
    await measured(`feedback-processes/${draft.json.id}/approve`, { method: 'POST', token: admin.access_token, status: 201 });
    await measured(`feedback-processes/${draft.json.id}/observation`, { method: 'POST', token: admin.access_token, status: 201, body: { observation: marker('observation') } });
    await measured('auth/login', { method: 'POST', body: { email, password: '' }, status: 400 });
    await measured('auth/users', { token: invalidToken, status: 401 });
    await measured('auth/users', { token: memberLogin.json.access_token, status: 403 });
    await measured(`missing-${marker('unknown_path')}`, { status: 404 });
    await installError();
    try { await measured('auth/teams', { method: 'POST', body: { name: marker('error_body') }, token: admin.access_token, status: 500 }); }
    finally { await removeError(); }
    await abortedRequest();
    const complete = await collectMeasured(before, initialLogs, ids, ids.length + 1, { manual: [
      [leaderLogin.id, ['auth.verify_password']], [draft.id, ['feedback.create']], [submitted.id, ['feedback.submit_for_validation']],
    ], requirePrisma: true });
    check(complete.logs.some((log) => log.status_code === 0 && log.code === 'REQUEST_ABORTED'), 'ABORT_NOT_COUNTED');
    check(complete.logs.some((log) => log.status_code === 500 && log.code === 'HTTP_INTERNAL_ERROR'), 'ERROR_CODE_UNSAFE');
    summary.sampling.full = { requests: complete.logs.length, traces: complete.logs.filter((log) => complete.spans.some((span) => span.traceId === log.trace_id && Number(span.kind) === 2)).length };
    summary.scenarios.push('privacy_full_payloads', 'stdout_json', 'request_ids', 'trace_log_correlation', 'bcrypt_prisma_feedback_children', '400_401_403_404_500_abort', 'counter_histogram_exact');
    console.log('Canários, hierarquia de traces e contagem completa passaram no cenário de 100%.');

    sampleRate = '0.1';
    await configuration();
    await run(compose('up', '-d', '--no-deps', '--force-recreate', 'api'));
    const sampledBefore = await ready();
    const sampledInitial = (await apiLogs()).completed.length;
    const sampledIds = [];
    for (let n = 0; n < 120; n++) {
      const result = await request(n % 2 ? 'auth/users' : `sampling-${n}`, { status: n % 2 ? 401 : 404, flag: n % 2 ? '01' : '00' });
      sampledIds.push(result.id);
    }
    await request('auth/login', { method: 'POST', body: { email, password: '' }, status: 400 }).then((result) => sampledIds.push(result.id));
    await request('auth/users', { token: memberLogin.json.access_token, status: 403 }).then((result) => sampledIds.push(result.id));
    await abortedRequest();
    const sampled = await collectMeasured(sampledBefore, sampledInitial, sampledIds, sampledIds.length + 1);
    const sampledRoots = sampled.logs.filter((log) => sampled.spans.some((span) => span.traceId === log.trace_id && Number(span.kind) === 2)).length;
    check(sampledRoots < sampled.logs.length, 'SAMPLING_BOUNDARY_OVERRIDDEN');
    summary.sampling.ten_percent = { requests: sampled.logs.length, traces: sampledRoots, exact_metric_coverage: true };
    console.log('Amostragem de 10% preservou todas as métricas e ignorou as flags do cliente.');

    sampleRate = '0';
    await configuration();
    await run(compose('up', '-d', '--no-deps', '--force-recreate', 'api'));
    const zeroBefore = await ready();
    const zeroInitial = (await apiLogs()).completed.length;
    const zeroIds = [];
    for (let n = 0; n < 4; n++) zeroIds.push((await request('auth/users', { status: 401 })).id);
    const zero = await collectMeasured(zeroBefore, zeroInitial, zeroIds, zeroIds.length);
    check(!zero.logs.some((log) => zero.spans.some((span) => span.traceId === log.trace_id)), 'ZERO_SAMPLING_IGNORED');
    summary.sampling.zero = { requests: zero.logs.length, traces: 0, exact_metric_coverage: true };

    // Stop the receiver and restart the API pointing to an address that refuses connections.
    exporterEndpoint = 'http://127.0.0.1:4318';
    sampleRate = '1';
    await configuration();
    await run(compose('stop', 'collector'));
    await run(compose('up', '-d', '--no-deps', '--force-recreate', 'api'));
    await waitFor(async () => {
      try { return (await fetch(`${baseUrl}/api/v1/auth/teams`, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
    }, 'OFFLINE_API_NOT_READY', 120000);
    const offlineStart = Date.now();
    await request('auth/login', { method: 'POST', body: { email: config.DEFAULT_ADMIN_RH_EMAIL, password: config.DEFAULT_ADMIN_RH_PASSWORD }, status: 201 });
    await request(`feedback-processes/${draft.json.id}`, { token: admin.access_token });
    await request('auth/teams', { method: 'POST', token: admin.access_token, status: 201, body: { name: marker('offline_team') } });
    summary.unavailable_exporter = { successful_requests: 3, duration_ms: Date.now() - offlineStart, business_write_confirmed: true };
    await delay(2200);
    const offlineLogs = await apiLogs();
    check(offlineLogs.logs.some((log) => log.event === 'telemetry.export.failed' && log.code === 'EXPORT_FAILED'), 'EXPORT_FAILURE_DIAGNOSTIC_MISSING');
    const container = (await run(containerLookupArgs(engine, project, 'api'))).stdout.trim();
    const stopStart = Date.now();
    await run([engine, 'stop', '--time', '12', container], { timeout: 16000 });
    const elapsed = Date.now() - stopStart;
    const inspect = JSON.parse((await run([engine, 'inspect', container])).stdout)[0];
    check(!inspect.State.Running && !inspect.State.OOMKilled && inspect.State.ExitCode === 0, 'SHUTDOWN_NOT_GRACEFUL');
    check(elapsed < 10000, 'SHUTDOWN_DEADLINE');
    await apiLogs(container);
    summary.shutdown = { duration_ms: elapsed, exit_code: inspect.State.ExitCode, exporter_unavailable: true };
    summary.scenarios.push('sampling_10_percent', 'sampling_zero', 'unavailable_exporter', 'bounded_sigterm');
    console.log(JSON.stringify(summary));
  } finally {
    let cleanupFailed = false;
    if (composeReady) {
      const result = await run(compose('down', '--volumes'), { optional: true, timeout: 90000 });
      if (result.code !== 0) { cleanupFailed = true; console.error('Limpeza dos containers de teste falhou. O projeto isolado requer inspeção.'); }
    }
    if (process.env.KEEP_TELEMETRY_ARTIFACTS === '1') console.log(`Artefatos brutos privados preservados em ${directory}. Não publique esses arquivos.`);
    else await rm(directory, { recursive: true, force: true });
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    if (cleanupFailed) fail('CLEANUP_FAILED');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'receiver') {
    const server = await startReceiver(process.argv[3] ?? '/capture');
    process.once('SIGTERM', () => server.close(() => process.exit(0)));
    process.once('SIGINT', () => server.close(() => process.exit(0)));
  } else {
    runVerification().catch((error) => {
      // Errors deliberately carry fixed codes. Never print the raw error, response, SQL or command output.
      console.error(`Verificação de observabilidade falhou: ${/^[A-Z0-9_.]+$/.test(error.message) ? error.message : 'UNEXPECTED_FAILURE'}`);
      process.exitCode = 1;
    });
  }
}
