import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SimpleSpanProcessor,
  InMemorySpanExporter,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { SpanStatusCode } from '@opentelemetry/api';
import { PrivateSpanExporter } from './exporters';

it('exports real spans without raw names, events, status messages or resource data', async () => {
  const sink = new InMemorySpanExporter();
  const provider = new TracerProvider({
    resource: resourceFromAttributes({
      'service.name': 'tcc20261-api',
      'host.name': 'CANARY',
      'process.command_args': ['CANARY'],
    }),
    spanProcessors: [
      new SimpleSpanProcessor({ exporter: new PrivateSpanExporter(sink) }),
    ],
  });
  const span = provider.getTracer('CANARY').startSpan('CANARY', {
    attributes: {
      'url.full': 'CANARY',
      'http.request.method': 'POST',
      'http.route': '/api/v1/auth/login',
    },
  });
  span.addEvent('CANARY', { 'exception.stacktrace': 'CANARY' });
  span.setStatus({ code: SpanStatusCode.ERROR, message: 'CANARY' });
  span.end();
  await provider.forceFlush();
  const exported = sink.getFinishedSpans();
  expect(exported).toHaveLength(1);
  expect(JSON.stringify(exported)).not.toContain('CANARY');
  expect(exported[0].attributes).toEqual({
    'http.request.method': 'POST',
    'http.route': '/api/v1/auth/login',
  });
  expect(exported[0].status).toEqual({ code: SpanStatusCode.ERROR });
  await provider.shutdown();
});
