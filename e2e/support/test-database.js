const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Os testes E2E apagam os dados do sistema. Esta trava aceita apenas banco
// local cujo nome termina em _test (mesma regra de backend/test/test-database.ts).
function assertTestDatabase(value) {
  if (!value) {
    throw new Error(
      'DATABASE_URL não está definida. Aponte para um banco de teste local, por exemplo postgresql://postgres:senha@localhost:5433/feedback_test.',
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL não é uma URL válida.');
  }

  const database = url.pathname.replace(/^\//, '');
  if (!LOCAL_HOSTS.has(url.hostname) || !database.endsWith('_test')) {
    throw new Error(
      'DATABASE_URL não aponta para um banco de teste: o host precisa ser local e o nome do banco precisa terminar em _test. Os testes E2E apagam dados e foram abortados.',
    );
  }
}

module.exports = { assertTestDatabase };
