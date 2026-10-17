import type { Attributes } from '@opentelemetry/api';

const routes = new Set([
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/teams',
  '/api/v1/auth/teams/:id',
  '/api/v1/auth/users',
  '/api/v1/auth/users/:id',
  '/api/v1/audit-logs',
  '/api/v1/feedback-processes',
  '/api/v1/feedback-processes/participants',
  '/api/v1/feedback-processes/:id',
  '/api/v1/feedback-processes/:id/submit',
  '/api/v1/feedback-processes/:id/approve',
  '/api/v1/feedback-processes/:id/observation',
  '/api/v1/feedback-processes/:id/request-adjustments',
  '/api/v1/health/live',
  '/api/v1/health/ready',
]);
const methods = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);
const operations = new Set([
  'auth.verify_password',
  'feedback.create',
  'feedback.submit_for_validation',
]);
const events = new Set([
  'http.request.completed',
  'telemetry.export.failed',
  'application.event',
]);
const codes = new Set([
  'HTTP_OK',
  'HTTP_CLIENT_ERROR',
  'HTTP_INTERNAL_ERROR',
  'REQUEST_ABORTED',
  'EXPORT_FAILED',
]);

export function safeRoute(route: unknown): string {
  return typeof route === 'string' && routes.has(route) ? route : '/unknown';
}
export function safeRequestRoute(request: unknown): string {
  if (typeof request !== 'object' || request === null || !('route' in request))
    return '/unknown';
  const route = request.route;
  return typeof route === 'object' && route !== null && 'path' in route
    ? safeRoute(route.path)
    : '/unknown';
}
export function safeMethod(method: unknown): string {
  return typeof method === 'string' && methods.has(method) ? method : 'OTHER';
}
export function sanitizeAttributes(
  attributes: Record<string, unknown>,
): Attributes {
  const result: Attributes = {};
  const method = attributes['http.request.method'] ?? attributes['http.method'];
  const status =
    attributes['http.response.status_code'] ?? attributes['http.status_code'];
  if (method !== undefined) result['http.request.method'] = safeMethod(method);
  if (attributes['http.route'] !== undefined)
    result['http.route'] = safeRoute(attributes['http.route']);
  if (
    typeof status === 'number' &&
    Number.isInteger(status) &&
    status >= 0 &&
    status <= 599
  ) {
    result['http.response.status_code'] = status;
  }
  return result;
}
export function sanitizeResourceAttributes(
  attributes: Record<string, unknown>,
): Attributes {
  const release = attributes['service.version'];
  const environment = attributes['deployment.environment.name'];
  return {
    'service.name': 'tcc20261-api',
    'deployment.environment.name':
      typeof environment === 'string' &&
      [
        'local',
        'development',
        'test',
        'prototype',
        'staging',
        'production',
      ].includes(environment)
        ? environment
        : 'local',
    ...(typeof release === 'string' && /^[a-f0-9]{7,40}$/i.test(release)
      ? { 'service.version': release }
      : {}),
  };
}
export function safeSpanName(name: string, scope: string): string {
  if (operations.has(name)) return name;
  if (scope.includes('instrumentation-http')) return 'http.request';
  if (scope.includes('instrumentation-express')) return 'express.request';
  if (scope.includes('instrumentation-nestjs')) return 'nestjs.handler';
  if (scope.includes('prisma')) return 'prisma.operation';
  return 'operation';
}
export function sanitizeLogFields(
  input: unknown,
): Record<string, string | number> {
  if (typeof input !== 'object' || input === null) return {};
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(input)) {
    if (validLogString(key, value)) result[key] = value;
    if (validLogNumber(key, value)) result[key] = value;
    if (key === 'method') result[key] = safeMethod(value);
    if (key === 'route') result[key] = safeRoute(value);
  }
  return result;
}
function validLogNumber(key: string, value: unknown): value is number {
  return (
    ['status_code', 'duration_ms'].includes(key) &&
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}
function validLogString(key: string, value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (key === 'event') return events.has(value);
  if (key === 'code') return codes.has(value);
  if (key === 'request_id')
    return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value,
    );
  if (key === 'trace_id') return /^[a-f0-9]{32}$/i.test(value);
  if (key === 'span_id') return /^[a-f0-9]{16}$/i.test(value);
  if (key === 'release') return /^[a-f0-9]{7,40}$/i.test(value);
  return false;
}
