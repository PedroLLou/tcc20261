import { sanitizeResourceAttributes } from './privacy';

export function boundedNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
}
function signalEndpoint(
  env: NodeJS.ProcessEnv,
  signal: 'traces' | 'metrics',
): string | undefined {
  const specific =
    signal === 'traces'
      ? env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
      : env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
  const base = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!specific && !base) return undefined;
  try {
    const url = new URL(specific ?? `${base?.replace(/\/$/, '')}/v1/${signal}`);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      [url.username, url.password, url.search, url.hash].some(Boolean)
    )
      throw new Error();
    return url.toString();
  } catch {
    throw new Error('INVALID_TELEMETRY_ENDPOINT');
  }
}
export function readTelemetryConfig(env: NodeJS.ProcessEnv = process.env) {
  const resourceAttributes = Object.fromEntries(
    (env.OTEL_RESOURCE_ATTRIBUTES ?? '').split(',').map((entry) => {
      const separator = entry.indexOf('=');
      return [entry.slice(0, separator), entry.slice(separator + 1)];
    }),
  );
  return {
    enabled: env.OTEL_SDK_DISABLED !== 'true',
    protocol: env.OTEL_EXPORTER_OTLP_PROTOCOL ?? 'http/protobuf',
    traceUrl:
      env.OTEL_SDK_DISABLED === 'true'
        ? undefined
        : signalEndpoint(env, 'traces'),
    metricUrl:
      env.OTEL_SDK_DISABLED === 'true'
        ? undefined
        : signalEndpoint(env, 'metrics'),
    sampleRatio: boundedNumber(env.OTEL_TRACES_SAMPLER_ARG, 0.1, 0, 1),
    timeout: boundedNumber(env.OTEL_EXPORTER_OTLP_TIMEOUT, 3000, 100, 3000),
    schedule: boundedNumber(env.OTEL_BSP_SCHEDULE_DELAY, 5000, 100, 5000),
    queue: Math.floor(boundedNumber(env.OTEL_BSP_MAX_QUEUE_SIZE, 512, 1, 512)),
    batch: Math.floor(
      boundedNumber(env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE, 128, 1, 128),
    ),
    metricInterval: boundedNumber(
      env.OTEL_METRIC_EXPORT_INTERVAL,
      60000,
      100,
      60000,
    ),
    resource: sanitizeResourceAttributes({
      ...resourceAttributes,
      'deployment.environment.name':
        resourceAttributes['deployment.environment.name'] ?? env.NODE_ENV,
      'service.version':
        resourceAttributes['service.version'] ??
        env.APP_RELEASE ??
        env.RENDER_GIT_COMMIT,
    }),
  };
}
export function deploymentConfig(env: NodeJS.ProcessEnv = process.env) {
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('INVALID_PORT');
  const origins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .filter(Boolean)
    .map((value) => {
      try {
        const url = new URL(value.trim());
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.origin !== value.trim()
        )
          throw new Error();
        return url.origin;
      } catch {
        throw new Error('INVALID_CORS_ORIGIN');
      }
    });
  return { port, origins };
}
