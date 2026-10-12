import {
  safeRoute,
  sanitizeAttributes,
  sanitizeResourceAttributes,
  safeSpanName,
} from './privacy';

describe('operational telemetry privacy', () => {
  it('drops arbitrary attributes, query data and raw exceptions', () => {
    expect(
      sanitizeAttributes({
        'http.request.method': 'POST',
        'http.route': '/api/v1/auth/login',
        'http.response.status_code': 401,
        'url.full': 'https://example.test/?token=CANARY',
        'db.statement': 'SELECT CANARY',
        'exception.message': 'CANARY',
        'user.email': 'CANARY@example.test',
      }),
    ).toEqual({
      'http.request.method': 'POST',
      'http.route': '/api/v1/auth/login',
      'http.response.status_code': 401,
    });
  });

  it('allows registered route patterns but never arbitrary URLs or path values', () => {
    expect(safeRoute('/api/v1/feedback-processes/:id/submit')).toBe(
      '/api/v1/feedback-processes/:id/submit',
    );
    expect(safeRoute('/api/v1/feedback-processes/123/submit')).toBe('/unknown');
    expect(safeRoute('/api/v1/auth/login?password=CANARY')).toBe('/unknown');
    expect(safeRoute('/CANARY')).toBe('/unknown');
  });

  it('rejects unknown span names and resource metadata', () => {
    expect(safeSpanName('CANARY', 'unknown')).toBe('operation');
    expect(safeSpanName('auth.verify_password', 'tcc.observability')).toBe(
      'auth.verify_password',
    );
    expect(
      sanitizeResourceAttributes({
        'service.name': 'tcc20261-api',
        'deployment.environment.name': 'test',
        'service.version': '0592e659',
        'process.command_args': ['CANARY'],
        'host.name': 'CANARY',
        'arbitrary.secret': 'CANARY',
      }),
    ).toEqual({
      'service.name': 'tcc20261-api',
      'deployment.environment.name': 'test',
      'service.version': '0592e659',
    });
  });
});
