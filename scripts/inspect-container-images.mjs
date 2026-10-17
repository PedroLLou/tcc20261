import { spawnSync } from 'node:child_process';

const engine = process.env.CONTAINER_ENGINE ?? 'podman';
if (!['podman', 'docker'].includes(engine)) throw new Error('INVALID_CONTAINER_ENGINE');
const refs = process.argv.slice(2);
if (!refs.length) throw new Error('Informe as imagens a comparar.');
const probe = `
const fs = require('node:fs');
const result = { node: process.version, uid: process.getuid(), shell: fs.existsSync('/bin/sh'), npm: fs.existsSync('/usr/local/lib/node_modules/npm'), prisma_cli: fs.existsSync('/app/node_modules/prisma'), typescript: fs.existsSync('/app/node_modules/typescript') };
const bcrypt = require('bcrypt');
result.bcrypt_verified = bcrypt.compareSync('synthetic', bcrypt.hashSync('synthetic', 4));
console.log(JSON.stringify(result));
`;
function run(args) {
  const result = spawnSync(engine, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('IMAGE_INSPECTION_FAILED');
  return result.stdout;
}
const results = refs.map((ref) => {
  const info = JSON.parse(run(['image', 'inspect', ref]))[0];
  const output = {
    image: ref,
    unpacked_bytes: info.Size,
    local_id: info.Id,
    architecture: info.Architecture,
    user: info.Config.User,
    entrypoint: info.Config.Entrypoint,
    command: info.Config.Cmd,
  };
  if (ref.includes('-api')) {
    output.runtime = JSON.parse(run(['run', '--rm', '--read-only', '--tmpfs', '/tmp:rw,size=32m', ref, '-e', probe]));
  }
  return output;
});
console.log(JSON.stringify(results, null, 2));
