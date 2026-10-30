const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function assertTestUrl(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(
      `${name} não está definida. Aponte para um banco de teste local, por exemplo postgresql://postgres:senha@localhost:5433/feedback_test.`,
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} não é uma URL válida.`);
  }

  const database = url.pathname.replace(/^\//, '');
  if (!LOCAL_HOSTS.has(url.hostname) || !database.endsWith('_test')) {
    throw new Error(
      `${name} não aponta para um banco de teste: o host precisa ser local e o nome do banco precisa terminar em _test. Os testes de integração apagam dados e foram abortados.`,
    );
  }
}

export function assertTestDatabase(env: NodeJS.ProcessEnv) {
  assertTestUrl('DATABASE_URL', env.DATABASE_URL);
  assertTestUrl('DIRECT_URL', env.DIRECT_URL);
}
