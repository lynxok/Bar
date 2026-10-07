import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/database';
import { __setFetch, connectCloud, fullUpload, loadCloudConfig, pushChanges, disconnectCloud } from '../../src/lib/cloud/cloudSync';
import { buildSchemaSql } from '../../src/lib/cloud/schema';

/** Supabase simulado: guarda lynx_records en memoria y registra las llamadas. */
function fakeSupabase(opts: { member?: boolean; schema?: boolean; online?: boolean } = {}) {
  const state = { member: opts.member ?? true, schema: opts.schema ?? true, online: opts.online ?? true };
  const records = new Map<string, any>();
  const calls: { method: string; path: string; body?: any }[] = [];
  const json = (status: number, body: any) => new Response(body === null ? null : JSON.stringify(body), { status });
  __setFetch((async (input: any, init: any = {}) => {
    if (!state.online) throw new TypeError('Failed to fetch');
    const url = new URL(String(input));
    const path = url.pathname + url.search;
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    if (url.pathname === '/auth/v1/token') {
      if (body.password === 'mala') return json(400, { error_description: 'Invalid login credentials' });
      return json(200, { access_token: 'tok', refresh_token: 'ref', expires_in: 3600 });
    }
    if (!state.schema) return json(404, { code: 'PGRST205', message: 'Could not find the table' });
    if (url.pathname === '/rest/v1/lynx_meta') return method === 'GET' ? json(200, state.member ? [{ value: 1 }] : []) : json(201, null);
    if (url.pathname === '/rest/v1/lynx_records') {
      if (method === 'POST') { for (const r of body) records.set(`${r.table_name}/${r.record_id}`, r); return json(201, null); }
      if (method === 'PATCH') {
        const t = url.searchParams.get('table_name')!.replace('eq.', '');
        const run = /sync_run\.neq\.([^)]+)/.exec(url.search)![1];
        for (const r of records.values()) if (r.table_name === t && !r.deleted && r.sync_run !== run) Object.assign(r, body);
        return json(204, null);
      }
    }
    return json(500, { message: 'no simulado' });
  }) as any);
  return { state, records, calls };
}

const creds = { url: 'https://abc.supabase.co/', anonKey: 'anon', email: 'Bar@Mail.com', password: 'secreta' };

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()));
  disconnectCloud();
});

describe('script SQL', () => {
  it('incluye el mail habilitado, RLS y escapa comillas', () => {
    const sql = buildSchemaSql("o'brien@bar.com");
    expect(sql).toContain("values ('o''brien@bar.com')");
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('revoke all on public.lynx_records');
  });
});

describe('conexión', () => {
  it('rechaza contraseña incorrecta, esquema faltante y usuario no habilitado', async () => {
    fakeSupabase();
    await expect(connectCloud({ ...creds, password: 'mala' })).rejects.toThrow(/incorrectos/);
    fakeSupabase({ schema: false });
    await expect(connectCloud(creds)).rejects.toThrow(/script SQL/);
    fakeSupabase({ member: false });
    await expect(connectCloud(creds)).rejects.toThrow(/no está habilitado/);
    expect(loadCloudConfig()).toBeNull();
  });

  it('guarda la configuración sin la contraseña', async () => {
    fakeSupabase();
    await connectCloud(creds);
    const cfg = loadCloudConfig()!;
    expect(cfg).toMatchObject({ url: 'https://abc.supabase.co', email: 'bar@mail.com', enabled: true });
    expect(JSON.stringify(cfg)).not.toContain('secreta');
  });
});

describe('sincronización', () => {
  it('carga completa sin usuarios, después solo cambios y borrados', async () => {
    const sb = fakeSupabase();
    await db.users.add({ name: 'Nacho', role: 'Superadmin', pin: '1234' } as any);
    const p1 = await db.products.add({ name: 'IPA', sku: 'I', category: 'Cervezas', stock: 1, unit: 'u', price: 1, takeawayPrice: 1, status: 'active' }) as number;
    await db.products.add({ name: 'Stout', sku: 'S', category: 'Cervezas', stock: 1, unit: 'u', price: 1, takeawayPrice: 1, status: 'active' });
    await db.salonTables.put({ id: 'T-1', status: 'available', order: [], lastUpdate: '', x: 0, y: 0, type: 'square', width: 1, height: 1, capacity: 2 } as any);
    await connectCloud(creds);
    await fullUpload();

    expect([...sb.records.keys()].sort()).toEqual(['products/1', 'products/2', 'salonTables/T-1']);
    expect([...sb.records.values()].some(r => r.table_name === 'users')).toBe(false);

    // Sin cambios: no sube nada
    sb.calls.length = 0;
    expect(await pushChanges()).toBe(0);
    expect(sb.calls.filter(c => c.path.startsWith('/rest/v1/lynx_records'))).toHaveLength(0);

    // Cambio + borrado (los timestamps los pone el hook del host; acá los simulamos)
    await new Promise(r => setTimeout(r, 5));
    const now = new Date().toISOString();
    await db.products.update(p1, { price: 99, updatedAt: now });
    await db.products.delete(2);
    await db.tombstones.add({ table: 'products', key: 2, deletedAt: now });
    expect(await pushChanges()).toBe(2);
    expect(sb.records.get('products/1').data.price).toBe(99);
    expect(sb.records.get('products/2')).toMatchObject({ deleted: true, data: null });

    // Y no los repite
    expect(await pushChanges()).toBe(0);
  });

  it('sin internet no pierde cambios: los sube al volver', async () => {
    const sb = fakeSupabase();
    await connectCloud(creds);
    await fullUpload();
    sb.state.online = false;
    const id = await db.products.add({ name: 'APA', sku: 'A', category: 'C', stock: 1, unit: 'u', price: 1, takeawayPrice: 1, status: 'active', updatedAt: new Date().toISOString() });
    expect(await pushChanges()).toBe(0);
    sb.state.online = true;
    expect(await pushChanges()).toBe(1);
    expect(sb.records.has(`products/${id}`)).toBe(true);
  });

  it('una nueva carga completa marca como borrado lo que ya no existe localmente', async () => {
    const sb = fakeSupabase();
    const id = await db.products.add({ name: 'IPA', sku: 'I', category: 'C', stock: 1, unit: 'u', price: 1, takeawayPrice: 1, status: 'active' });
    await connectCloud(creds);
    await fullUpload();
    expect(sb.records.get(`products/${id}`)).toMatchObject({ deleted: false });
    await db.products.clear();
    await fullUpload();
    expect(sb.records.get(`products/${id}`)).toMatchObject({ deleted: true });
  });
});
