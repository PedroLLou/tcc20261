import { diag, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter as ProtobufTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPTraceExporter as JsonTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter as ProtobufMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPMetricExporter as JsonMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import {
  ExpressInstrumentation,
  ExpressLayerType,
} from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { IncomingMessage, ServerResponse } from 'node:http';
import { readTelemetryConfig } from './config';
import { PrivateMetricExporter, PrivateSpanExporter } from './exporters';
import { safeMethod, safeRequestRoute } from './privacy';

// SDK diagnostics can contain endpoint credentials or exception text. Disable them;
// exporter wrappers provide fixed, rate-limited failure codes instead.
const noop = () => {};
// NodeSDK otherwise replaces this private logger when OTEL_LOG_LEVEL is set.
delete process.env.OTEL_LOG_LEVEL;
diag.setLogger(
  { error: noop, warn: noop, info: noop, debug: noop, verbose: noop },
  DiagLogLevel.NONE,
);
const config = readTelemetryConfig();

function spanProcessors() {
  const TraceExporter =
    config.protocol === 'http/json' ? JsonTraceExporter : ProtobufTraceExporter;
  return config.traceUrl
    ? [
        new BatchSpanProcessor({
          exporter: new PrivateSpanExporter(
            new TraceExporter({
              url: config.traceUrl,
              timeoutMillis: config.timeout,
              concurrencyLimit: 1,
            }),
          ),
          maxQueueSize: config.queue,
          maxExportBatchSize: Math.min(config.batch, config.queue),
          scheduledDelayMillis: config.schedule,
          exportTimeoutMillis: config.timeout,
        }),
      ]
    : [
        {
          onStart: noop,
          onEnd: noop,
          forceFlush: () => Promise.resolve(),
          shutdown: () => Promise.resolve(),
        },
      ];
}
function metricReaders() {
  const MetricExporter =
    config.protocol === 'http/json'
      ? JsonMetricExporter
      : ProtobufMetricExporter;
  return config.metricUrl
    ? [
        new PeriodicExportingMetricReader({
          exporter: new PrivateMetricExporter(
            new MetricExporter({
              url: config.metricUrl,
              timeoutMillis: config.timeout,
              concurrencyLimit: 1,
            }),
          ),
          exportIntervalMillis: config.metricInterval,
          exportTimeoutMillis: Math.min(config.timeout, config.metricInterval),
        }),
      ]
    : [];
}
function createSdk(): NodeSDK {
  if (!['http/json', 'http/protobuf'].includes(config.protocol))
    throw new Error('INVALID_TELEMETRY_PROTOCOL');
  return new NodeSDK({
    autoDetectResources: false,
    resourceDetectors: [],
    resource: resourceFromAttributes(config.resource),
    sampler: new TraceIdRatioBasedSampler(config.sampleRatio),
    spanProcessors: spanProcessors(),
    metricReaders: metricReaders(),
    // Each public request starts a fresh server trace. Browser propagation
    // is deferred; caller baggage, parent IDs and sampled flags have no authority.
    textMapPropagator: {
      inject: noop,
      extract: (context) => context,
      fields: () => [],
    },
    logRecordProcessors: [],
    instrumentations: [
      new HttpInstrumentation({
        ignoreOutgoingRequestHook: () => true,
        applyCustomAttributesOnSpan(span, request, response) {
          if (
            request instanceof IncomingMessage &&
            response instanceof ServerResponse
          ) {
            span.setAttributes({
              'http.request.method': safeMethod(request.method),
              'http.route': safeRequestRoute(request),
              'http.response.status_code':
                request.aborted || !response.writableFinished
                  ? 0
                  : response.statusCode,
            });
          }
        },
      }),
      new ExpressInstrumentation({
        ignoreLayersType: [ExpressLayerType.MIDDLEWARE],
      }),
      new NestInstrumentation(),
      new PrismaInstrumentation({
        ignoreSpanTypes: ['prisma:engine:db_query'],
      }),
      new PinoInstrumentation({ disableLogSending: true }),
    ],
  });
}
const sdk = config.enabled ? createSdk() : undefined;
sdk?.start();
export function shutdownTelemetry(): Promise<void> {
  return sdk?.shutdown() ?? Promise.resolve();
}
