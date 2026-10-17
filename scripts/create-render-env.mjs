import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = process.argv[2] ?? fileURLToPath(new URL('../.env.render', import.meta.url));
const secret = () => randomBytes(32).toString('hex');
const content = [
  '# Configuração privada. Preencher no editor; não executar com source.',
  '# Conectores autenticados dispensam as chaves administrativas abaixo.',
  'RENDER_API_KEY=',
  'RENDER_WORKSPACE_ID=',
  'NEON_API_KEY=',
  '# URL direta do Neon com sslmode=require. Não usar o hostname -pooler.',
  'DATABASE_URL=',
  `JWT_SECRET=${secret()}`,
  'DEFAULT_ADMIN_RH_EMAIL=admin@example.invalid',
  `DEFAULT_ADMIN_RH_PASSWORD=${secret()}`,
  '# Somente origens HTTPS, sem /api/v1 ou outros caminhos.',
  'API_URL=',
  'FRONTEND_URL=',
  '# Origem HTTPS do frontend para a API; várias origens usam vírgula.',
  'CORS_ORIGINS=',
  '# Exportação opcional. Cabeçalhos contêm credenciais e permanecem privados.',
  'OTEL_EXPORTER_OTLP_ENDPOINT=',
  'OTEL_EXPORTER_OTLP_HEADERS=',
  '',
].join('\n');

try {
  writeFileSync(path, content, { flag: 'wx', mode: 0o600 });
  console.log('Configuração privada criada com permissão 0600. Valores não exibidos.');
} catch (error) {
  console.error(error.code === 'EEXIST'
    ? 'O arquivo já existe. A configuração foi preservada.'
    : 'Não foi possível criar a configuração privada.');
  process.exitCode = 1;
}
