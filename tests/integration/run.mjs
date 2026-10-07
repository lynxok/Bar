// Prueba de integración host <-> celular con IndexedDB simulado.
// Uso: npm run test:sync   (requiere devDependencies: tsx, fake-indexeddb)
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';

// En Linux/macOS el host corre en su propio grupo de procesos para poder cerrarlo entero
// (npx -> tsx -> node); si no, queda vivo ocupando los puertos 3001 y 3999.
const host = spawn(npx, ['tsx', path.join(dir, 'host.ts')], { cwd: dir, shell: isWin, detached: !isWin });

function killHost() {
  if (host.exitCode !== null || !host.pid) return;
  try {
    if (isWin) execSync(`taskkill /pid ${host.pid} /T /F`, { stdio: 'ignore' });
    else process.kill(-host.pid, 'SIGKILL');
  } catch { /* ya terminó */ }
}
process.on('exit', killHost);
process.on('SIGINT', () => { killHost(); process.exit(130); });

let ready = false;
host.stdout.on('data', d => {
  if (!ready && String(d).includes('HOST LISTO')) {
    ready = true;
    const client = spawn(npx, ['tsx', path.join(dir, 'client.ts')], { cwd: dir, stdio: 'inherit', shell: isWin });
    client.on('exit', code => { killHost(); process.exit(code ?? 1); });
  }
});
host.stderr.on('data', d => process.stderr.write(d));
setTimeout(() => { if (!ready) { console.error('El host simulado no arrancó'); killHost(); process.exit(1); } }, 30000);
