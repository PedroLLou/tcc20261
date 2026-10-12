import { lstatSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

export const defaultConfigPath = fileURLToPath(new URL('../.env.render', import.meta.url));

export class RenderConfigError extends Error {}

export function loadPrivateConfig(path, keys) {
  let file;
  try {
    file = lstatSync(path);
  } catch {
    throw new RenderConfigError('Configuração privada não encontrada. Execute create-render-env.mjs.');
  }
  if (!file.isFile() || (file.mode & 0o077) !== 0) {
    throw new RenderConfigError('A configuração deve ser um arquivo regular privado com permissão 0600.');
  }
  let config;
  try {
    config = parseEnv(readFileSync(path, 'utf8'));
  } catch {
    throw new RenderConfigError('Não foi possível ler a configuração privada.');
  }
  for (const key of keys) {
    if (!config[key]?.trim()) throw new RenderConfigError(`Preencha ${key} na configuração privada.`);
  }
  return config;
}

export function publicOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new RenderConfigError('Configure uma origem HTTPS pública válida, sem credenciais ou caminhos.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new RenderConfigError('Configure uma origem HTTPS pública válida, sem credenciais ou caminhos.');
  }
  return url.origin;
}
