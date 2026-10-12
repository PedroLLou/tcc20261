import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultConfigPath, loadPrivateConfig } from './render-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

try {
  const config = loadPrivateConfig(process.argv[2] ?? defaultConfigPath, ['DATABASE_URL']);
  let url;
  try {
    url = new URL(config.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL deve ser uma conexão PostgreSQL direta com TLS.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode'))
    || url.hostname.includes('-pooler.')) {
    throw new Error('DATABASE_URL deve ser uma conexão PostgreSQL direta com TLS, sem pooler.');
  }
  const engine = process.env.CONTAINER_ENGINE ?? 'podman';
  if (!['podman', 'docker'].includes(engine)) throw new Error('CONTAINER_ENGINE deve ser podman ou docker.');
  const image = 'localhost/tcc20261-render-migrate:local';
  const run = (args, failure) => {
    const result = spawnSync(engine, args, {
      cwd: root,
      env: { ...process.env, DATABASE_URL: config.DATABASE_URL },
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    // A saída do Prisma pode incluir dados da conexão. Exibir somente códigos fixos.
    if (result.error || result.status !== 0) throw new Error(failure);
  };
  run(['build', '--target', 'migration', '-f', 'backend/Containerfile', '-t', image, 'backend'],
    'Falha ao construir o migrador (MIGRATION_BUILD_FAILED).');
  console.log('Imagem de migração construída.');
  run(['run', '--rm', '--env', 'DATABASE_URL', image],
    'Falha ao aplicar migrations (MIGRATION_DEPLOY_FAILED). Não iniciar o deploy.');
  run(['run', '--rm', '--env', 'DATABASE_URL', image, './node_modules/.bin/prisma', 'migrate', 'status'],
    'Falha ao verificar migrations (MIGRATION_STATUS_FAILED). Não iniciar o deploy.');
  console.log('Migrations aplicadas e sem pendências. A API pode receber a mesma release verificada.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
