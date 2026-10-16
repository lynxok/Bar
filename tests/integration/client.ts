// Celular simulado: Dexie propio + syncService real contra el host por HTTP
import { setupBrowserGlobals } from './common.ts';
setupBrowserGlobals('http://127.0.0.1:3001', '#/mozo');
let pass = 0, fail = 0;
const ok = (c: any, m: string) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const ctl = async (q: string) => (await fetch('http://127.0.0.1:3999/' + q)).json();

const { login } = await import('../../src/lib/auth.ts');
const { db, flushOutbox } = await import('../../src/db/database.ts');
const sync = await import('../../src/services/syncService.ts');

const r = await login('Juan', '0000');
ok(r.ok, 'login del mozo contra el host');
await sync.runFullSync();
ok((await db.products.count()) === 2, 'sync completa trae productos');
ok((await db.users.count()) === 0, 'el mozo no descarga usuarios');
ok((await db.salonTables.get('T-1')) != null, 'trae mesas');
const localOrdersBefore = await db.orders.count();
ok(localOrdersBefore === 2, 'trae órdenes existentes (ids 1 y 2)');

console.log('Cobro desde el celular (transacción con add + update)');
// Se fuerza un choque: el contador local de autoincremento queda distinto del host
await (db.orders as any).originalAdd({ id: 50, tableId: 'LOCAL-ONLY', items: [], total: 0, status: 'closed', timestamp: 'z' });
await (db.orders as any).originalDelete(50);
let txError: any = null;
try {
  await db.transaction('rw', [db.orders, db.products], async () => {
    await db.orders.add({ tableId: 'T-1', items: [{ name: 'Cerveza', qty: 2 }], total: 6000, status: 'closed', timestamp: new Date().toISOString() } as any);
    const p = await db.products.get(1);
    await db.products.update(1, { stock: p!.stock - 2 });
  });
} catch (e) { txError = e; }
ok(!txError, 'la transacción local no se corta (sin PrematureCommitError)');
await sleep(300); await flushOutbox();
const hostOrders = await ctl('orders');
const newHostOrder = hostOrders.find((o: any) => o.tableId === 'T-1');
ok(newHostOrder && newHostOrder.id === 3, `el host asignó su propio id (${newHostOrder?.id}) en vez del local (51)`);
ok(newHostOrder?.updatedAt, 'el host marcó updatedAt');
ok((await db.orders.get(3))?.tableId === 'T-1' && !(await db.orders.get(51)), 'el celular remapeó el id local al del host');
ok((await ctl('product?id=1')).stock === 48, 'el stock se actualizó en el host');
ok((await db.outbox.count()) === 0, 'outbox vacío tras enviar');

console.log('Cambios hechos en el host');
await ctl('updateProduct?id=2&price=2500');
await ctl('deleteProduct?id=1');
await sleep(200);
await sync.runFullSync(['products']);
ok((await db.products.get(2))?.price === 2500, 'sync incremental trae la modificación');
ok(!(await db.products.get(1)), 'sync incremental replica el borrado (tombstone)');

console.log('Sin conexión');
const realFetch = globalThis.fetch;
(globalThis as any).fetch = async () => { throw new TypeError('Failed to fetch'); };
await db.salonTables.update('T-1', { status: 'consuming' } as any);
await sleep(100);
ok((await db.outbox.count()) === 1, 'cambio sin red queda en outbox');
(globalThis as any).fetch = realFetch;
await sync.runFullSync(['salonTables']);
ok((await db.outbox.count()) === 0, 'al volver la red se envía solo');
const t1 = await (await realFetch('http://127.0.0.1:3001/api/public/table/T-1')).json();
ok(t1.table.status === 'consuming', 'el host recibió el cambio hecho offline');

console.log('Protección de cambios pendientes');
(globalThis as any).fetch = async (u: any, o: any) => String(u).includes('/api/db/') ? (() => { throw new TypeError('Failed to fetch'); })() : realFetch(u, o);
await db.products.update(2, { stock: 1 });
await sleep(100);
await sync.runFullSync(['products']);
ok((await db.products.get(2))?.stock === 1, 'la sync no pisa un cambio local sin confirmar');
(globalThis as any).fetch = realFetch;
await sync.runFullSync(['products']);
ok((await ctl('product?id=2')).stock === 1, 'el cambio llega al host después');

console.log('Tiempo real (SSE)');
const token = localStorage.getItem('bar_token');
const resp = await realFetch(`http://127.0.0.1:3001/api/events?token=${token}`);
const reader = resp.body!.getReader();
await ctl('updateProduct?id=2&price=2600');
let got = '';
const deadline = Date.now() + 3000;
while (Date.now() < deadline && !got.includes('"table":"products"')) {
  const { value } = await Promise.race([reader.read(), sleep(3000).then(() => ({ value: undefined }))]) as any;
  if (value) got += new TextDecoder().decode(value);
}
ok(got.includes('"table":"products"'), 'el host avisa por SSE qué tabla cambió');
ok((await realFetch('http://127.0.0.1:3001/api/events?token=malo')).status === 401, 'SSE sin token válido -> 401');
reader.cancel();

console.log('Copias de seguridad (host)');
const before = (await ctl('product?id=2')).price;
const rt = await ctl('backupRoundtrip');
ok(rt.price === before && rt.customers === 0, 'restaurar deja los datos como en la copia');
ok(rt.tombstones === 0, 'la restauración no genera borrados para replicar');
ok(rt.backups.some((n: string) => n.endsWith('-prerestore.json.gz')), 'antes de restaurar se guarda una copia del estado actual');

console.log(`\n${pass} OK, ${fail} fallidos`);
process.exit(fail ? 1 : 0);
