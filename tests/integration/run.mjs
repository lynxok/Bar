// Prueba de integración host <-> celular con IndexedDB simulado.
// Uso: npm run test:sync   (requiere devDependencies: tsx, fake-indexeddb)
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const tsx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const host = spawn(tsx, ['tsx', path.join(dir, 'host.ts')], { cwd: dir, shell: process.platform === 'win32' });
let ready = false;
host.stdout.on('data', d => {
  if (!ready && String(d).includes('HOST LISTO')) {
    ready = true;
    const client = spawn(tsx, ['tsx', path.join(dir, 'client.ts')], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' });
    client.on('exit', code => { host.kill(); process.exit(code ?? 1); });
  }
});
host.stderr.on('data', d => process.stderr.write(d));
setTimeout(() => { if (!ready) { console.error('El host simulado no arrancó'); host.kill(); process.exit(1); } }, 30000);
