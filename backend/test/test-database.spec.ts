import { assertTestDatabase } from './test-database';

const testUrl = 'postgresql://postgres:senha@localhost:5433/feedback_test';

describe('assertTestDatabase', () => {
  it('deve aceitar bancos locais cujo nome termina em _test', () => {
    expect(() =>
      assertTestDatabase({ DATABASE_URL: testUrl, DIRECT_URL: testUrl }),
    ).not.toThrow();
  });

  it.each([
    ['sem DATABASE_URL', { DIRECT_URL: testUrl }],
    ['sem DIRECT_URL', { DATABASE_URL: testUrl }],
    [
      'com banco remoto',
      {
        DATABASE_URL: 'postgresql://u:s@ep-teste.neon.tech/feedback_test',
        DIRECT_URL: testUrl,
      },
    ],
    [
      'com nome que não termina em _test',
      {
        DATABASE_URL: 'postgresql://u:s@localhost:5434/feedback_dev',
        DIRECT_URL: testUrl,
      },
    ],
    [
      'com a DIRECT_URL apontando para outro banco',
      {
        DATABASE_URL: testUrl,
        DIRECT_URL: 'postgresql://u:s@localhost:5434/feedback_dev',
      },
    ],
    [
      'com URL inválida',
      { DATABASE_URL: 'isto-nao-e-url', DIRECT_URL: testUrl },
    ],
  ])('deve recusar %s', (_caso, env) => {
    expect(() => assertTestDatabase(env)).toThrow();
  });
});
