import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { assertPrivate, assertRequestMetrics, assertTraceHierarchy, assertTelemetryShape, attributes, startReceiver, containerLookupArgs } from '../scripts/verify-observability.mjs';

const attrs = (method, route, status) => [
  { key: 'http.request.method', value: { stringValue: method } },
  { key: 'http.route', value: { stringValue: route } },
  { key: 'http.response.status_code', value: { intValue: String(status) } },
];
function metrics(count, extra = []) {
  return { resourceMetrics: [{ scopeMetrics: [{ metrics: [
    { name: 'tcc.http.request.count', unit: '{request}', sum: { aggregationTemporality: 2, dataPoints: [{ attributes: attrs('GET', '/unknown', 404), asDouble: count }] } },
    { name: 'tcc.http.request.duration', unit: 's', histogram: { aggregationTemporality: 2, dataPoints: [{ attributes: [...attrs('GET', '/unknown', 404), ...extra], count: String(count) }] } },
    { name: 'tcc.process.memory.rss', gauge: { dataPoints: [{ asDouble: 20 }] } },
  ] }] }] };
}

test('checks all raw fields and escaped values without disclosing the canary', () => {
  const marker = 'private-marker-12345';
  for (const raw of [JSON.stringify({ resourceSpans: [{ unexpected: marker }] }), JSON.stringify({ nested: { value: marker } }).replaceAll('p', '\\u0070')]) {
    assert.throws(() => assertPrivate([raw], [{ label: 'password', value: marker }]), (error) => error.message === 'PRIVACY_CANARY_PASSWORD' && !error.message.includes(marker));
  }
  assertPrivate(['{"safe":"http.request.completed"}'], [{ label: 'password', value: marker }]);
});

test('reads OTLP string and integer attributes', () => {
  assert.deepEqual(attributes(attrs('GET', '/unknown', 404)), {
    'http.request.method': 'GET', 'http.route': '/unknown', 'http.response.status_code': 404,
  });
});

test('counts cumulative metrics once per request using the baseline delta', () => {
  const logs = [1, 2].map(() => ({ method: 'GET', route: '/unknown', status_code: 404 }));
  assert.equal(assertRequestMetrics(metrics(3), metrics(5), logs), 2);
  assert.throws(() => assertRequestMetrics(metrics(3), metrics(6), logs), /METRIC_COUNT_MISMATCH/);
  assert.throws(() => assertRequestMetrics(metrics(3), metrics(5, [{ key: 'user.email', value: { stringValue: 'private' } }]), logs), /METRIC_ATTRIBUTE/);
});

test('rejects metric temporality changes and mismatched histogram counts', () => {
  const after = metrics(2);
  after.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.aggregationTemporality = 1;
  assert.throws(() => assertRequestMetrics(metrics(1), after, [{ method: 'GET', route: '/unknown', status_code: 404 }]), /METRIC_TEMPORALITY/);
  const inconsistent = metrics(2);
  inconsistent.resourceMetrics[0].scopeMetrics[0].metrics[1].histogram.dataPoints[0].count = '3';
  assert.throws(() => assertRequestMetrics(metrics(1), inconsistent, [{ method: 'GET', route: '/unknown', status_code: 404 }]), /METRIC_DURATION_MISMATCH/);
});

test('requires manual and Prisma spans to be descendants of the correlated HTTP span', () => {
  const traceId = 'a'.repeat(32);
  const root = { traceId, spanId: '1'.repeat(16), name: 'POST /api/v1/auth/login', kind: 2 };
  const password = { traceId, spanId: '2'.repeat(16), parentSpanId: root.spanId, name: 'auth.verify_password' };
  const prisma = { traceId, spanId: '3'.repeat(16), parentSpanId: password.spanId, name: 'prisma:client:operation' };
  const log = { trace_id: traceId, span_id: root.spanId };
  assertTraceHierarchy([root, password, prisma], log, ['auth.verify_password'], true);
  assert.throws(() => assertTraceHierarchy([root, { ...password, parentSpanId: '' }, prisma], log, ['auth.verify_password'], true), /TRACE_MANUAL_PARENT/);
  assert.throws(() => assertTraceHierarchy([root, password], log, ['auth.verify_password'], true), /TRACE_PRISMA_MISSING/);
  assert.throws(() => assertTraceHierarchy([root, password, prisma], { ...log, span_id: '4'.repeat(16) }, ['auth.verify_password'], true), /TRACE_LOG_CORRELATION/);
});

test('rejects unapproved fields in resources, span events and metrics', () => {
  const payload = { resourceSpans: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: 'tcc20261-api' } }] }, scopeSpans: [{ spans: [{ name: 'http.request', attributes: attrs('GET', '/api/v1/auth/teams', 200) }] }] }] };
  assertTelemetryShape([payload]);
  const event = structuredClone(payload);
  event.resourceSpans[0].scopeSpans[0].spans[0].events = [{ name: 'exception', attributes: [] }];
  assert.throws(() => assertTelemetryShape([event]), /SPAN_ERROR_OR_EVENT_CONTENT/);
  const resource = structuredClone(payload);
  resource.resourceSpans[0].resource.attributes.push({ key: 'process.command_args', value: { arrayValue: { values: [] } } });
  assert.throws(() => assertTelemetryShape([resource]), /RESOURCE_ALLOWLIST/);
});

test('accepts versioned route patterns and rejects concrete IDs as metric labels', () => {
  const payload = metrics(1);
  const logs = [{ method: 'GET', route: '/api/v1/feedback-processes/:id', status_code: 404 }];
  for (const metric of payload.resourceMetrics[0].scopeMetrics[0].metrics.slice(0, 2)) {
    (metric.sum ?? metric.histogram).dataPoints[0].attributes = attrs('GET', logs[0].route, 404);
  }
  const before = structuredClone(payload);
  before.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].asDouble = 0;
  before.resourceMetrics[0].scopeMetrics[0].metrics[1].histogram.dataPoints[0].count = '0';
  assert.equal(assertRequestMetrics(before, payload, logs), 1);
  payload.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes = attrs('GET', '/api/v1/feedback-processes/123', 404);
  assert.throws(() => assertRequestMetrics(before, payload, logs), /METRIC_ROUTE/);
});

test('receiver accepts complete compressed OTLP JSON privately and rejects malformed payloads', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'tcc-otlp-test-'));
  const server = await startReceiver(directory, 0, '127.0.0.1');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    await rm(directory, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${server.address().port}/v1/traces`;
  const payload = JSON.stringify({ resourceSpans: [{ complete: { unknown: 'synthetic-receiver-marker' } }] });
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body: gzipSync(payload),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {});
  const files = await readdir(directory);
  assert.equal(files.length, 1);
  assert.equal(await readFile(join(directory, files[0]), 'utf8'), payload);
  assert.equal((await stat(join(directory, files[0]))).mode & 0o777, 0o600);
  const malformed = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(malformed.status, 400);
  const protobuf = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' }, body: 'unsupported' });
  assert.equal(protobuf.status, 415);
  assert.equal((await readdir(directory)).length, 1);
});

test('container lookup scopes the service to its isolated project and includes stopped containers', () => {
  for (const engine of ['podman', 'docker']) {
    assert.deepEqual(containerLookupArgs(engine, 'tcc-test-unique', 'api'), [
      engine, 'ps', '--all', '--quiet',
      '--filter', 'label=com.docker.compose.project=tcc-test-unique',
      '--filter', 'label=com.docker.compose.service=api',
    ]);
  }
});
