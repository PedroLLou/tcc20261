import { SpanStatusCode, trace } from '@opentelemetry/api';

type Operation =
  'auth.verify_password' | 'feedback.create' | 'feedback.submit_for_validation';
export function withOperationSpan<T>(
  name: Operation,
  operation: () => Promise<T>,
): Promise<T> {
  return trace
    .getTracer('tcc.observability')
    .startActiveSpan(name, async (span) => {
      try {
        return await operation();
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
}
