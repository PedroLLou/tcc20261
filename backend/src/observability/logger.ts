import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';
import type { Options } from 'pino-http';
import { sanitizeLogFields } from './privacy';

export const pinoHttpOptions: Options = {
  // Pino child bindings bypass parent bindings formatters. This wildcard
  // censor applies the same allowlist before those values are serialized.
  redact: {
    paths: [
      '*',
      'event',
      'request_id',
      'trace_id',
      'span_id',
      'method',
      'route',
      'status_code',
      'duration_ms',
      'code',
      'release',
    ],
    censor: (value: unknown, path) =>
      sanitizeLogFields({ [path[0]]: value })[path[0]],
  },
  level: 'info',
  base: undefined,
  autoLogging: false,
  quietReqLogger: true,
  quietResLogger: true,
  customAttributeKeys: { reqId: 'request_id' },
  genReqId: (request, response) => {
    const id = typeof request.id === 'string' ? request.id : randomUUID();
    response.setHeader('X-Request-Id', id);
    return id;
  },
  serializers: {
    req: () => ({}),
    res: () => ({}),
    err: () => ({ code: 'HTTP_INTERNAL_ERROR' }),
  },
  formatters: { log: sanitizeLogFields, bindings: sanitizeLogFields },
  hooks: {
    logMethod(args, method) {
      method.call(this, {
        event: 'application.event',
        ...sanitizeLogFields(args[0]),
      });
    },
  },
};
export const loggerOptions: Params = { pinoHttp: pinoHttpOptions };
