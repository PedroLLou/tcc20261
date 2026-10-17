import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = process.argv[2] ?? fileURLToPath(new URL('../.env', import.meta.url));
const secret = () => randomBytes(32).toString('hex');
const databasePassword = secret();
const databaseUrl = `postgresql://tcc:${databasePassword}@db:5432/tcc?schema=public`;
const content = [
  'WEB_PORT=8080',
  'POSTGRES_DB=tcc',
  'POSTGRES_USER=tcc',
  `POSTGRES_PASSWORD=${databasePassword}`,
  `DATABASE_URL=${databaseUrl}`,
  // No banco local do Compose, as migrações usam o mesmo usuário da API.
  `DIRECT_URL=${databaseUrl}`,
  `JWT_SECRET=${secret()}`,
  'DEFAULT_ADMIN_RH_EMAIL=admin@example.invalid',
  `DEFAULT_ADMIN_RH_PASSWORD=${secret()}`,
  '',
].join('\n');

try {
  writeFileSync(path, content, { flag: 'wx', mode: 0o600 });
  console.log(`Configuração criada em ${path}. Credenciais não serão exibidas.`);
} catch (error) {
  console.error(error.code === 'EEXIST'
    ? 'O arquivo já existe. As credenciais foram preservadas.'
    : 'Não foi possível criar o arquivo de configuração.');
  process.exitCode = 1;
}
