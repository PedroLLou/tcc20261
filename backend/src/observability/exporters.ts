import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace';
import {
  AggregationTemporality,
  DataPointType,
  type DataPoint,
  type MetricData,
  type PushMetricExporter,
  type ResourceMetrics,
} from '@opentelemetry/sdk-metrics';
import {
  sanitizeAttributes,
  sanitizeResourceAttributes,
  safeSpanName,
} from './privacy';

export function sanitizeSpan(span: ReadableSpan): ReadableSpan {
  const attributes = sanitizeAttributes(span.attributes);
  const context = span.spanContext();
  const parent = span.parentSpanContext;
  const scope = safeScope(span.instrumentationScope.name);
  return {
    name: safeSpanName(span.name, scope),
    kind: span.kind,
    spanContext: () => ({
      traceId: context.traceId,
      spanId: context.spanId,
      traceFlags: context.traceFlags,
    }),
    parentSpanContext: parent
      ? {
          traceId: parent.traceId,
          spanId: parent.spanId,
          traceFlags: parent.traceFlags,
        }
      : undefined,
    startTime: span.startTime,
    endTime: span.endTime,
    duration: span.duration,
    status: { code: span.status.code },
    attributes,
    links: [],
    events: [],
    ended: span.ended,
    resource: resourceFromAttributes(
      sanitizeResourceAttributes(span.resource.attributes),
    ),
    instrumentationScope: { name: scope },
    droppedAttributesCount:
      span.droppedAttributesCount +
      Object.keys(span.attributes).length -
      Object.keys(attributes).length,
    droppedEventsCount: span.droppedEventsCount + span.events.length,
    droppedLinksCount: span.droppedLinksCount + span.links.length,
  };
}
function safeScope(scope: string): string {
  const known = [
    '@opentelemetry/instrumentation-http',
    '@opentelemetry/instrumentation-express',
    '@opentelemetry/instrumentation-nestjs-core',
    'prisma',
    '@prisma/instrumentation',
  ];
  return known.includes(scope) ? scope : 'tcc.observability';
}
function sanitizePoint<T>(point: DataPoint<T>): DataPoint<T> {
  return { ...point, attributes: sanitizeAttributes(point.attributes) };
}
function sanitizeMetric(metric: MetricData): MetricData {
  switch (metric.dataPointType) {
    case DataPointType.SUM:
    case DataPointType.GAUGE:
      return { ...metric, dataPoints: metric.dataPoints.map(sanitizePoint) };
    case DataPointType.HISTOGRAM:
      return { ...metric, dataPoints: metric.dataPoints.map(sanitizePoint) };
    case DataPointType.EXPONENTIAL_HISTOGRAM:
      return { ...metric, dataPoints: metric.dataPoints.map(sanitizePoint) };
  }
}
let nextFailureLog = 0;
function reportResult(result: ExportResult): void {
  if (result.code === ExportResultCode.SUCCESS || Date.now() < nextFailureLog)
    return;
  nextFailureLog = Date.now() + 60000;
  process.stdout.write(
    JSON.stringify({
      level: 40,
      time: Date.now(),
      event: 'telemetry.export.failed',
      code: 'EXPORT_FAILED',
    }) + '\n',
  );
}
function safeResult(result: ExportResult): ExportResult {
  reportResult(result);
  return { code: result.code };
}
export class PrivateSpanExporter implements SpanExporter {
  constructor(private readonly exporter: SpanExporter) {}
  export(
    spans: ReadableSpan[],
    callback: (result: ExportResult) => void,
  ): void {
    this.exporter.export(spans.map(sanitizeSpan), (result) =>
      callback(safeResult(result)),
    );
  }
  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }
  forceFlush(): Promise<void> {
    return this.exporter.forceFlush?.() ?? Promise.resolve();
  }
}
export class PrivateMetricExporter implements PushMetricExporter {
  constructor(private readonly exporter: PushMetricExporter) {}
  selectAggregationTemporality(): AggregationTemporality {
    return AggregationTemporality.CUMULATIVE;
  }
  export(
    metrics: ResourceMetrics,
    callback: (result: ExportResult) => void,
  ): void {
    this.exporter.export(
      {
        resource: resourceFromAttributes(
          sanitizeResourceAttributes(metrics.resource.attributes),
        ),
        scopeMetrics: metrics.scopeMetrics
          .filter(({ scope }) => scope.name === 'tcc.observability')
          .map(({ metrics: values }) => ({
            scope: { name: 'tcc.observability' },
            metrics: values.map(sanitizeMetric),
          })),
      },
      (result) => callback(safeResult(result)),
    );
  }
  forceFlush(): Promise<void> {
    return this.exporter.forceFlush();
  }
  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }
}
