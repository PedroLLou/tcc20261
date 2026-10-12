import { randomUUID } from 'node:crypto';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { metrics, trace, type SpanContext } from '@opentelemetry/api';
import type { NextFunction, Request, Response } from 'express';
import type { PinoLogger } from 'nestjs-pino';
import { readTelemetryConfig } from './config';
import { safeMethod, safeRequestRoute, sanitizeLogFields } from './privacy';

const meter = metrics.getMeter('tcc.observability');
const counter = meter.createCounter('tcc.http.request.count', {
  description: 'Completed or aborted HTTP requests',
  unit: '{request}',
});
const duration = meter.createHistogram('tcc.http.request.duration', {
  description: 'HTTP request duration',
  unit: 's',
  advice: {
    explicitBucketBoundaries: [0, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  },
});
const release = readTelemetryConfig().resource['service.version'];

function correlation(context: SpanContext | undefined): Record<string, string> {
  return context ? { trace_id: context.traceId, span_id: context.spanId } : {};
}
function responseCode(status: number, aborted: boolean): string {
  if (aborted) return 'REQUEST_ABORTED';
  if (status >= 500) return 'HTTP_INTERNAL_ERROR';
  return status >= 400 ? 'HTTP_CLIENT_ERROR' : 'HTTP_OK';
}
export function requestTelemetry(logger: PinoLogger) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const requestId = randomUUID();
    request.id = requestId;
    response.setHeader('X-Request-Id', requestId);
    const started = process.hrtime.bigint();
    const span = trace.getActiveSpan();
    const context = span?.spanContext();
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      const aborted = request.aborted || !response.writableFinished;
      const status = aborted ? 0 : response.statusCode;
      const seconds = Number(process.hrtime.bigint() - started) / 1e9;
      const method = safeMethod(request.method);
      const route = safeRequestRoute(request);
      const attributes = {
        'http.request.method': method,
        'http.route': route,
        'http.response.status_code': status,
      };
      counter.add(1, attributes);
      duration.record(seconds, attributes);
      logger.info(
        sanitizeLogFields({
          event: 'http.request.completed',
          request_id: requestId,
          ...correlation(context),
          method,
          route,
          status_code: status,
          duration_ms: seconds * 1000,
          code: responseCode(status, aborted),
          release,
        }),
      );
    };
    // Set the safe root attributes before HTTP instrumentation ends its span.
    response.prependOnceListener('finish', finish);
    response.prependOnceListener('close', finish);
    request.once('aborted', finish);
    next();
  };
}
export function startProcessMetrics(): () => void {
  const loop = monitorEventLoopDelay({ resolution: 20 });
  loop.enable();
  meter
    .createObservableGauge('tcc.process.memory.rss', { unit: 'By' })
    .addCallback((result) => result.observe(process.memoryUsage().rss));
  meter
    .createObservableGauge('tcc.process.memory.heap', { unit: 'By' })
    .addCallback((result) => result.observe(process.memoryUsage().heapUsed));
  meter
    .createObservableCounter('tcc.process.cpu.time', { unit: 's' })
    .addCallback((result) => {
      const cpu = process.cpuUsage();
      result.observe((cpu.user + cpu.system) / 1e6);
    });
  meter
    .createObservableGauge('tcc.process.event_loop.delay', { unit: 's' })
    .addCallback((result) => {
      result.observe(
        Number.isFinite(loop.mean) ? loop.percentile(95) / 1e9 : 0,
      );
      loop.reset();
    });
  return () => loop.disable();
}
