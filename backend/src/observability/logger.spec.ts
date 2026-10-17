import { Writable } from 'node:stream';
import pino from 'pino';
import { pinoHttpOptions } from './logger';

it('filters logs and child bindings before Pino serializes raw values', () => {
  let output = '';
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  const logger = pino(pinoHttpOptions, stream).child({
    secret: 'CANARY',
    request_id: 'd903163e-706c-4c4c-b876-a4983235e15a',
  });
  logger.info(
    {
      event: 'http.request.completed',
      route: '/api/v1/auth/login',
      method: 'POST',
      status_code: 401,
      password: 'CANARY',
      user: { email: 'CANARY' },
    },
    'CANARY',
  );
  logger.error(new Error('CANARY'), 'CANARY');
  expect(output).not.toContain('CANARY');
  const first: unknown = JSON.parse(output.split('\n')[0]);
  expect(first).toMatchObject({
    request_id: 'd903163e-706c-4c4c-b876-a4983235e15a',
    event: 'http.request.completed',
    route: '/api/v1/auth/login',
    method: 'POST',
    status_code: 401,
  });
});
