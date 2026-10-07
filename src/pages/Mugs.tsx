// Vasos propios y lockers: alta de vasos con QR, lockers físicos con abono,
// ranking de litros y configuración del programa (puntos por litro, precios de recarga, hitos).
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import QRCode from 'qrcode';
import { Beer, History, Lock, Plus, Printer, QrCode, RefreshCw, Search, Settings2, Trash2, Trophy, Unlock, Wrench } from 'lucide-react';
import { db, type Locker, type Mug, type MugProgramConfig } from '../db/database';
import { useStore } from '../contexts/StoreContext';
import { useBusiness } from '../contexts/BusinessContext';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { formatLiters, generateMugCode, getMugProgram, mugQrPayload } from '../lib/mugs';
import { computeTotals } from '../lib/pricing';
import { formatMoney } from '../lib/format';
import { getStoredUser, isAdminRole } from '../lib/auth';
import { cn } from '../lib/utils';

type Tab = 'mugs' | 'lockers' | 'ranking' | 'config';
const PAYMENT_METHODS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Billetera'];
const today = () => new Date().toISOString().split('T')[0];

const inputCls = 'w-full h-11 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20';
const labelCls = 'block text-xs font-black uppercase tracking-wide text-on-surface-variant mb-1';
const btnPrimary = 'h-11 px-4 rounded-xl bg-primary text-on-primary text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50';
const btnGhost = 'h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-bold flex items-center justify-center gap-2';

async function printMugLabels(mugs: Mug[], businessName = 'LYNX BarOS') {
  const imgs = await Promise.all(mugs.map(m => QRCode.toDataURL(mugQrPayload(m.code), { width: 260, margin: 1 })));
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<html><head><title>Etiquetas de vasos</title><style>
    body{font-family:Arial,sans-serif;display:flex;flex-wrap:wrap;gap:12px;padding:12px}
    .l{width:5cm;border:1px dashed #999;border-radius:8px;padding:8px;text-align:center}
    img{width:4cm;height:4cm}.c{font-size:18px;font-weight:900;letter-spacing:3px}.n{font-size:11px;color:#333}
    @media print{.l{break-inside:avoid}}</style></head><body>
    ${mugs.map((m, i) => `<div class="l"><img src="${imgs[i]}"/><div class="c">${m.code}</div><div class="n">${m.customerName} · ${formatLiters(m.capacityMl)}</div><div class="n">${businessName}</div></div>`).join('')}
    <script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
}

export default function Mugs() {
  const { showToast, confirm } = useToast();
  const { customers, products, addCustomer, closePOSOrder } = useStore();
  const { taxRate, pricesIncludeTax } = useBusiness() as any;
  const isAdmin = isAdminRole(getStoredUser()?.role);

  const mugs = useLiveQuery(() => db.mugs.toArray(), []) || [];
  const lockers = useLiveQuery(() => db.lockers.toArray(), []) || [];
  const fills = useLiveQuery(() => db.mugFills.toArray(), []) || [];
  const config = useLiveQuery(() => db.loyaltyConfig.get('global'), []);
  const program = getMugProgram(config);

  const [tab, setTab] = useState<Tab>('mugs');
  const [search, setSearch] = useState('');

  const sortedLockers = useMemo(() => [...lockers].sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true })), [lockers]);
  const lockerById = useMemo(() => new Map(lockers.map(l => [l.id!, l])), [lockers]);
  const mugById = useMemo(() => new Map(mugs.map(m => [m.id!, m])), [mugs]);
  const monthKey = today().slice(0, 7);
  const monthMl = fills.filter(f => f.timestamp.startsWith(monthKey)).reduce((a, f) => a + f.volumeMl, 0);
  const expiredLockers = lockers.filter(l => l.status === 'assigned' && l.expiresAt && l.expiresAt < today());

  /** Cobra por la caja rápida (requiere turno abierto). */
  const charge = async (item: any, paymentMethod: string, customerDni?: string) => {
    const gross = computeTotals(item.price * (item.qty || 1), { taxRate, pricesIncludeTax }).total;
    await closePOSOrder([item], gross, paymentMethod, { customerDni, awardPoints: false });
  };

  // ---------------- Vasos ----------------
  const emptyMug = { dni: '', name: '', phone: '', capacityMl: 1000, customMl: '', model: '', lockerId: '', price: '', charge: false, paymentMethod: 'Efectivo' };
  const [mugForm, setMugForm] = useState<typeof emptyMug | null>(null);
  const [qrMug, setQrMug] = useState<Mug | null>(null);
  const [qrImg, setQrImg] = useState('');
  const [historyMug, setHistoryMug] = useState<Mug | null>(null);

  const formCustomer = mugForm?.dni ? customers.find(c => c.dni === mugForm.dni.trim()) : undefined;

  const showQr = async (m: Mug) => { setQrMug(m); setQrImg(await QRCode.toDataURL(mugQrPayload(m.code), { width: 320, margin: 1 })); };

  const uniqueCode = async () => {
    for (let i = 0; i < 10; i++) {
      const c = generateMugCode();
      if (!(await db.mugs.where('code').equals(c).first())) return c;
    }
    throw new Error('No se pudo generar un código único, probá de nuevo.');
  };

  const saveMug = async () => {
    if (!mugForm) return;
    const dni = mugForm.dni.trim();
    if (!dni) return showToast('Ingresá el DNI del cliente.', 'warning');
    const capacityMl = mugForm.capacityMl === -1 ? Math.round(Number(mugForm.customMl)) : mugForm.capacityMl;
    if (!(capacityMl > 0)) return showToast('Capacidad inválida.', 'warning');
    try {
      let name = formCustomer?.name;
      if (!formCustomer) {
        if (!mugForm.name.trim()) return showToast('El cliente no existe: ingresá su nombre para darlo de alta.', 'warning');
        await addCustomer({ dni, name: mugForm.name.trim(), phone: mugForm.phone.trim() || undefined });
        name = mugForm.name.trim();
      }
      const code = await uniqueCode();
      const price = Number(mugForm.price) || 0;
      const lockerId = mugForm.lockerId ? Number(mugForm.lockerId) : undefined;
      const id = await db.mugs.add({
        code, customerDni: dni, customerName: name!, capacityMl, model: mugForm.model.trim() || undefined,
        status: 'active', lockerId, totalMl: 0, fillCount: 0, purchasePrice: price || undefined, createdAt: new Date().toISOString(),
      }) as number;
      if (lockerId) {
        await db.lockers.update(lockerId, { status: 'assigned', customerDni: dni, customerName: name, mugId: id, assignedAt: new Date().toISOString() });
      }
      if (mugForm.charge && price > 0) {
        try {
          await charge({ id: `MUG-SALE-${code}`, name: `Vaso propio ${code} (${formatLiters(capacityMl)})`, price, qty: 1 }, mugForm.paymentMethod, dni);
        } catch (e: any) {
          showToast(`El vaso quedó cargado pero no se pudo cobrar: ${e.message}`, 'warning');
        }
      }
      setMugForm(null);
      const created = await db.mugs.get(id);
      if (created) showQr(created);
      showToast(`Vaso ${code} cargado para ${name}.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'No se pudo guardar el vaso.', 'error');
    }
  };

  const setMugStatus = async (m: Mug, status: Mug['status']) => {
    const ok = await confirm({ title: status === 'lost' ? 'Marcar como perdido' : 'Dar de baja', message: `¿Seguro? El QR ${m.code} deja de servir para recargas.`, confirmText: 'Sí', isDestructive: true } as any);
    if (!ok) return;
    await db.mugs.update(m.id!, { status });
    if (status === 'retired' && m.lockerId) await db.lockers.update(m.lockerId, { mugId: undefined });
  };

  const replaceQr = async (m: Mug) => {
    const ok = await confirm({ title: 'Reemplazar QR', message: `Se genera un código nuevo y el ${m.code} deja de funcionar. Los litros acumulados se mantienen.`, confirmText: 'Reemplazar' } as any);
    if (!ok) return;
    const code = await uniqueCode();
    await db.mugs.update(m.id!, { code, status: 'active' });
    const updated = await db.mugs.get(m.id!);
    if (updated) showQr(updated);
  };

  const visibleMugs = mugs
    .filter(m => !search || [m.code, m.customerName, m.customerDni, m.model].some(v => (v || '').toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => (b.lastFillAt || b.createdAt).localeCompare(a.lastFillAt || a.createdAt));

  // ---------------- Lockers ----------------
  const [batch, setBatch] = useState<{ prefix: string; from: string; to: string; fee: string } | null>(null);
  const [lockerSel, setLockerSel] = useState<Locker | null>(null);
  const [assign, setAssign] = useState({ dni: '', mugId: '', expiresAt: '' });
  const [renew, setRenew] = useState({ months: '1', paymentMethod: 'Efectivo' });

  const createBatch = async () => {
    if (!batch) return;
    const from = Math.floor(Number(batch.from)), to = Math.floor(Number(batch.to));
    if (!(from > 0) || !(to >= from) || to - from > 500) return showToast('Rango inválido (máximo 500 por vez).', 'warning');
    const existing = new Set(lockers.map(l => l.label));
    const fee = Number(batch.fee) || undefined;
    const rows: Locker[] = [];
    for (let n = from; n <= to; n++) {
      const label = `${batch.prefix.trim()}${batch.prefix.trim() ? '-' : ''}${n}`;
      if (!existing.has(label)) rows.push({ label, status: 'free', monthlyFee: fee });
    }
    await db.lockers.bulkAdd(rows);
    setBatch(null);
    showToast(`${rows.length} locker(s) creados.`, 'success');
  };

  const openLocker = (l: Locker) => { setLockerSel(l); setAssign({ dni: '', mugId: '', expiresAt: '' }); setRenew({ months: '1', paymentMethod: 'Efectivo' }); };

  const assignLocker = async () => {
    if (!lockerSel) return;
    const cust = customers.find(c => c.dni === assign.dni.trim());
    if (!cust) return showToast('No existe un cliente con ese DNI. Cargá primero su vaso.', 'warning');
    const mugId = assign.mugId ? Number(assign.mugId) : undefined;
    await db.lockers.update(lockerSel.id!, {
      status: 'assigned', customerDni: cust.dni, customerName: cust.name, mugId,
      assignedAt: new Date().toISOString(), expiresAt: assign.expiresAt || undefined,
    });
    if (mugId) await db.mugs.update(mugId, { lockerId: lockerSel.id });
    setLockerSel(null);
  };

  const releaseLocker = async (l: Locker) => {
    const ok = await confirm({ title: `Liberar locker ${l.label}`, message: 'El vaso queda sin locker asignado.', confirmText: 'Liberar', isDestructive: true } as any);
    if (!ok) return;
    if (l.mugId) await db.mugs.update(l.mugId, { lockerId: undefined });
    await db.lockers.update(l.id!, { status: 'free', customerDni: undefined, customerName: undefined, mugId: undefined, assignedAt: undefined, expiresAt: undefined });
    setLockerSel(null);
  };

  const renewLocker = async (l: Locker) => {
    const months = Math.max(1, Math.floor(Number(renew.months) || 1));
    const fee = (l.monthlyFee ?? program.defaultLockerFee) || 0;
    if (!(fee > 0)) return showToast('Definí el abono mensual del locker (o el abono por defecto en Configuración).', 'warning');
    try {
      await charge({ id: `LOCKER-${l.label}-${Date.now()}`, name: `Abono locker ${l.label} (${months} ${months === 1 ? 'mes' : 'meses'})`, price: fee * months, qty: 1, lockerRenewal: { lockerId: l.id, months } }, renew.paymentMethod, l.customerDni);
      showToast(`Abono del locker ${l.label} cobrado.`, 'success');
      setLockerSel(null);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // ---------------- Ranking ----------------
  const [rankPeriod, setRankPeriod] = useState<'month' | 'all'>('month');
  const ranking = useMemo(() => {
    const acc = new Map<string, { dni: string; name: string; ml: number; fills: number }>();
    for (const f of fills) {
      if (rankPeriod === 'month' && !f.timestamp.startsWith(monthKey)) continue;
      const name = mugById.get(f.mugId)?.customerName || f.ownerDni;
      const r = acc.get(f.ownerDni) || { dni: f.ownerDni, name, ml: 0, fills: 0 };
      r.ml += f.volumeMl; r.fills += 1;
      acc.set(f.ownerDni, r);
    }
    return [...acc.values()].sort((a, b) => b.ml - a.ml).slice(0, 50);
  }, [fills, rankPeriod, mugById, monthKey]);

  // ---------------- Configuración ----------------
  const [draft, setDraft] = useState<MugProgramConfig | null>(null);
  const cfg = draft || program;
  const editCfg = (patch: Partial<MugProgramConfig>) => setDraft({ ...cfg, ...patch });
  const [newFill, setNewFill] = useState({ productId: '', pricePerLiter: '' });

  const saveConfig = async () => {
    if (!draft) return;
    if (!(await db.loyaltyConfig.get('global'))) return showToast('Falta la configuración de fidelidad.', 'error');
    await db.loyaltyConfig.update('global', { mugProgram: draft });
    setDraft(null);
    showToast('Configuración de vasos guardada.', 'success');
  };

  const addFillProduct = () => {
    const p = products.find(x => String(x.id) === newFill.productId);
    const ppl = Number(newFill.pricePerLiter);
    if (!p || !(ppl > 0)) return showToast('Elegí la cerveza y su precio por litro.', 'warning');
    editCfg({ fillProducts: [...cfg.fillProducts.filter(f => f.productId !== p.id), { productId: p.id!, name: p.name, pricePerLiter: ppl }] });
    setNewFill({ productId: '', pricePerLiter: '' });
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'mugs', label: 'Vasos', icon: Beer },
    { id: 'lockers', label: 'Lockers', icon: Lock },
    { id: 'ranking', label: 'Ranking de litros', icon: Trophy },
    { id: 'config', label: 'Configuración', icon: Settings2 },
  ];

  const lockerStyle = (l: Locker) =>
    l.status === 'maintenance' ? 'border-slate-300 bg-slate-100 text-slate-500 dark:bg-white/5'
      : l.status === 'free' ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
      : l.expiresAt && l.expiresAt < today() ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
      : 'border-primary/40 bg-primary/10 text-on-surface';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-on-surface flex items-center gap-2"><Beer className="w-6 h-6 text-primary" /> Vasos y Lockers</h1>
          <p className="text-sm text-on-surface-variant">Vasos propios con QR, recargas por litro y lockers físicos.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
          {[
            ['Vasos activos', String(mugs.filter(m => m.status === 'active').length)],
            ['Lockers ocupados', `${lockers.filter(l => l.status === 'assigned').length}/${lockers.length}`],
            ['Litros del mes', formatLiters(monthMl)],
            ['Abonos vencidos', String(expiredLockers.length)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-wide text-on-surface-variant">{k}</div>
              <div className="text-lg font-black text-on-surface">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.filter(t => t.id !== 'config' || isAdmin).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('whitespace-nowrap h-10 px-4 rounded-full text-xs font-bold uppercase tracking-wide border flex items-center gap-2',
              tab === t.id ? 'bg-primary text-on-primary border-transparent' : 'bg-surface-container-lowest border-outline-variant text-on-surface')}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'mugs' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, cliente, DNI o modelo" className={cn(inputCls, 'pl-9')} />
            </div>
            <button onClick={() => printMugLabels(visibleMugs.filter(m => m.status === 'active'))} className={btnGhost} disabled={!visibleMugs.length}><Printer className="w-4 h-4" /> Imprimir etiquetas</button>
            <button onClick={() => setMugForm({ ...emptyMug })} className={btnPrimary}><Plus className="w-4 h-4" /> Nuevo vaso</button>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant/60">
            {visibleMugs.length === 0 && <div className="p-10 text-center text-on-surface-variant font-bold">Todavía no hay vasos cargados.</div>}
            {visibleMugs.map(m => (
              <div key={m.id} className={cn('p-4 flex items-center gap-4 flex-wrap', m.status !== 'active' && 'opacity-60')}>
                <div className="w-24">
                  <div className="font-black tracking-widest text-on-surface">{m.code}</div>
                  <div className="text-[11px] text-on-surface-variant">{formatLiters(m.capacityMl)}</div>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <div className="font-bold text-on-surface">{m.customerName}</div>
                  <div className="text-xs text-on-surface-variant">
                    DNI {m.customerDni}{m.model ? ` · ${m.model}` : ''}{m.lockerId ? ` · Locker ${lockerById.get(m.lockerId)?.label ?? '?'}` : ''}
                    {m.status === 'lost' && ' · PERDIDO'}{m.status === 'retired' && ' · DE BAJA'}
                  </div>
                </div>
                <div className="text-right w-28">
                  <div className="font-black text-on-surface">{formatLiters(m.totalMl)}</div>
                  <div className="text-[11px] text-on-surface-variant">{m.fillCount} recargas</div>
                </div>
                <div className="flex gap-1">
                  <button title="Ver QR" onClick={() => showQr(m)} className="p-2 rounded-lg bg-surface-container text-on-surface"><QrCode className="w-4 h-4" /></button>
                  <button title="Historial" onClick={() => setHistoryMug(m)} className="p-2 rounded-lg bg-surface-container text-on-surface"><History className="w-4 h-4" /></button>
                  <button title="Reemplazar QR" onClick={() => replaceQr(m)} className="p-2 rounded-lg bg-surface-container text-on-surface"><RefreshCw className="w-4 h-4" /></button>
                  {m.status === 'active' && <button title="Marcar perdido" onClick={() => setMugStatus(m, 'lost')} className="px-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">Perdido</button>}
                  {m.status !== 'retired' && <button title="Dar de baja" onClick={() => setMugStatus(m, 'retired')} className="p-2 rounded-lg bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'lockers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-3 text-xs font-bold text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300" /> Libre</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/40" /> Ocupado</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> Abono vencido</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-300" /> Mantenimiento</span>
            </div>
            {isAdmin && <button onClick={() => setBatch({ prefix: 'A', from: '1', to: '20', fee: String(program.defaultLockerFee || '') })} className={btnPrimary}><Plus className="w-4 h-4" /> Crear lockers</button>}
          </div>
          {sortedLockers.length === 0 ? (
            <div className="p-10 text-center text-on-surface-variant font-bold rounded-2xl border border-outline-variant bg-surface-container-lowest">No hay lockers cargados.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
              {sortedLockers.map(l => (
                <button key={l.id} onClick={() => openLocker(l)} className={cn('aspect-square rounded-xl border-2 p-2 flex flex-col items-center justify-center text-center', lockerStyle(l))}>
                  {l.status === 'free' ? <Unlock className="w-4 h-4" /> : l.status === 'maintenance' ? <Wrench className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <div className="font-black text-sm mt-1">{l.label}</div>
                  <div className="text-[10px] font-bold truncate w-full">{l.customerName || ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ranking' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['month', 'all'] as const).map(p => (
              <button key={p} onClick={() => setRankPeriod(p)} className={cn('h-9 px-4 rounded-full text-xs font-bold border', rankPeriod === p ? 'bg-primary text-on-primary border-transparent' : 'border-outline-variant text-on-surface')}>
                {p === 'month' ? 'Este mes' : 'Histórico'}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant/60">
            {ranking.length === 0 && <div className="p-10 text-center text-on-surface-variant font-bold">Sin recargas en el período.</div>}
            {ranking.map((r, i) => (
              <div key={r.dni} className="p-3 flex items-center gap-4">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-black text-sm', i < 3 ? 'bg-amber-400 text-black' : 'bg-surface-container text-on-surface')}>{i + 1}</div>
                <div className="flex-1"><div className="font-bold text-on-surface">{r.name}</div><div className="text-xs text-on-surface-variant">{r.fills} recargas</div></div>
                <div className="font-black text-on-surface">{formatLiters(r.ml)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'config' && isAdmin && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
            <h2 className="font-black text-on-surface">Puntos y precios</h2>
            <div>
              <span className={labelCls}>Las recargas suman puntos</span>
              <div className="flex gap-2">
                {([['per_liter', 'Por litro'], ['per_peso', 'Por plata gastada']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => editCfg({ pointsMode: v })} className={cn('flex-1 h-10 rounded-xl border text-sm font-bold', cfg.pointsMode === v ? 'border-primary bg-primary/10 text-on-surface' : 'border-outline-variant text-on-surface-variant')}>{l}</button>
                ))}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1">{cfg.pointsMode === 'per_peso' ? '1 punto cada $100 cobrados en la recarga.' : 'Los puntos se calculan por litro servido.'} Las promociones con multiplicador de Fidelización también aplican.</p>
            </div>
            {cfg.pointsMode === 'per_liter' && (
              <div><label className={labelCls}>Puntos por litro</label><input type="number" min={0} className={inputCls} value={cfg.pointsPerLiter} onChange={e => editCfg({ pointsPerLiter: Number(e.target.value) })} /></div>
            )}
            <div><label className={labelCls}>Descuento de socio en recargas (%)</label><input type="number" min={0} max={100} className={inputCls} value={cfg.holderDiscountPct} onChange={e => editCfg({ holderDiscountPct: Number(e.target.value) })} />
              <p className="text-[11px] text-on-surface-variant mt-1">0 = mismo precio que el resto. Al cargar la recarga se puede quitar caso por caso.</p></div>
            <div><label className={labelCls}>Abono mensual de locker por defecto ($)</label><input type="number" min={0} className={inputCls} value={cfg.defaultLockerFee} onChange={e => editCfg({ defaultLockerFee: Number(e.target.value) })} /></div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
            <h2 className="font-black text-on-surface">Cervezas para recarga</h2>
            {cfg.fillProducts.length === 0 && <p className="text-sm text-on-surface-variant">Ninguna todavía.</p>}
            {cfg.fillProducts.map(f => (
              <div key={f.productId} className="flex items-center gap-2">
                <div className="flex-1 text-sm font-bold text-on-surface">{f.name}</div>
                <input type="number" className={cn(inputCls, 'w-32')} value={f.pricePerLiter}
                  onChange={e => editCfg({ fillProducts: cfg.fillProducts.map(x => x.productId === f.productId ? { ...x, pricePerLiter: Number(e.target.value) } : x) })} />
                <span className="text-xs text-on-surface-variant">/ L</span>
                <button onClick={() => editCfg({ fillProducts: cfg.fillProducts.filter(x => x.productId !== f.productId) })} className="p-2 rounded-lg bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <select className={inputCls} value={newFill.productId} onChange={e => setNewFill({ ...newFill, productId: e.target.value })}>
                <option value="">Elegí un producto…</option>
                {products.filter(p => p.status !== 'inactive').map(p => <option key={p.id} value={p.id}>{p.name}{p.category ? ` (${p.category})` : ''}</option>)}
              </select>
              <input type="number" placeholder="$ / litro" className={cn(inputCls, 'w-32')} value={newFill.pricePerLiter} onChange={e => setNewFill({ ...newFill, pricePerLiter: e.target.value })} />
              <button onClick={addFillProduct} className={btnGhost}><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-3 md:col-span-2">
            <h2 className="font-black text-on-surface">Hitos por litros acumulados</h2>
            <p className="text-[11px] text-on-surface-variant">Al cruzar cada hito el cliente suma los puntos extra automáticamente.</p>
            {cfg.milestones.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center">
                <input type="number" className={inputCls} value={m.liters} onChange={e => editCfg({ milestones: cfg.milestones.map((x, j) => j === i ? { ...x, liters: Number(e.target.value) } : x) })} placeholder="Litros" />
                <input type="number" className={inputCls} value={m.bonusPoints} onChange={e => editCfg({ milestones: cfg.milestones.map((x, j) => j === i ? { ...x, bonusPoints: Number(e.target.value) } : x) })} placeholder="Puntos extra" />
                <input className={inputCls} value={m.label} onChange={e => editCfg({ milestones: cfg.milestones.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} placeholder="Nombre" />
                <button onClick={() => editCfg({ milestones: cfg.milestones.filter((_, j) => j !== i) })} className="p-2 rounded-lg bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <div className="flex justify-between flex-wrap gap-2">
              <button onClick={() => editCfg({ milestones: [...cfg.milestones, { liters: 0, bonusPoints: 0, label: '' }] })} className={btnGhost}><Plus className="w-4 h-4" /> Agregar hito</button>
              <div className="flex gap-2">
                {draft && <button onClick={() => setDraft(null)} className={btnGhost}>Descartar</button>}
                <button onClick={saveConfig} disabled={!draft} className={btnPrimary}>Guardar configuración</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alta de vaso */}
      <Modal isOpen={!!mugForm} onClose={() => setMugForm(null)} title="Nuevo vaso" description="Se genera un QR único para el vaso del cliente" maxWidth="lg">
        {mugForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1"><label className={labelCls}>DNI del cliente</label><input className={inputCls} value={mugForm.dni} onChange={e => setMugForm({ ...mugForm, dni: e.target.value })} /></div>
              {formCustomer ? (
                <div className="col-span-2 sm:col-span-1 flex items-end"><div className="text-sm font-bold text-on-surface">✓ {formCustomer.name} · {formCustomer.points} pts</div></div>
              ) : (
                <>
                  <div className="col-span-2 sm:col-span-1"><label className={labelCls}>Nombre (cliente nuevo)</label><input className={inputCls} value={mugForm.name} onChange={e => setMugForm({ ...mugForm, name: e.target.value })} /></div>
                  <div className="col-span-2"><label className={labelCls}>Teléfono (opcional)</label><input className={inputCls} value={mugForm.phone} onChange={e => setMugForm({ ...mugForm, phone: e.target.value })} /></div>
                </>
              )}
            </div>
            <div>
              <span className={labelCls}>Capacidad</span>
              <div className="flex gap-2">
                {[500, 1000, -1].map(v => (
                  <button key={v} onClick={() => setMugForm({ ...mugForm, capacityMl: v })} className={cn('flex-1 h-10 rounded-xl border text-sm font-bold', mugForm.capacityMl === v ? 'border-primary bg-primary/10 text-on-surface' : 'border-outline-variant text-on-surface-variant')}>
                    {v === -1 ? 'Otra' : formatLiters(v)}
                  </button>
                ))}
              </div>
              {mugForm.capacityMl === -1 && <input type="number" placeholder="ml" className={cn(inputCls, 'mt-2')} value={mugForm.customMl} onChange={e => setMugForm({ ...mugForm, customMl: e.target.value })} />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Modelo / grabado</label><input className={inputCls} value={mugForm.model} onChange={e => setMugForm({ ...mugForm, model: e.target.value })} placeholder="Ej.: Jarra de vidrio grabada" /></div>
              <div><label className={labelCls}>Locker</label>
                <select className={inputCls} value={mugForm.lockerId} onChange={e => setMugForm({ ...mugForm, lockerId: e.target.value })}>
                  <option value="">Sin locker</option>
                  {sortedLockers.filter(l => l.status === 'free').map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Precio del vaso ($)</label><input type="number" className={inputCls} value={mugForm.price} onChange={e => setMugForm({ ...mugForm, price: e.target.value })} /></div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 text-sm text-on-surface"><input type="checkbox" checked={mugForm.charge} onChange={e => setMugForm({ ...mugForm, charge: e.target.checked })} /> Cobrar ahora</label>
                {mugForm.charge && <select className={inputCls} value={mugForm.paymentMethod} onChange={e => setMugForm({ ...mugForm, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}</select>}
              </div>
            </div>
            <button onClick={saveMug} className={cn(btnPrimary, 'w-full h-12')}><QrCode className="w-4 h-4" /> Crear vaso y generar QR</button>
          </div>
        )}
      </Modal>

      {/* QR del vaso */}
      <Modal isOpen={!!qrMug} onClose={() => setQrMug(null)} title={`Vaso ${qrMug?.code ?? ''}`} description={qrMug ? `${qrMug.customerName} · ${formatLiters(qrMug.capacityMl)}` : ''} maxWidth="sm">
        {qrMug && (
          <div className="flex flex-col items-center gap-4">
            {qrImg && <img src={qrImg} alt={`QR del vaso ${qrMug.code}`} className="w-56 h-56 rounded-xl bg-white p-2" />}
            <div className="text-2xl font-black tracking-[0.3em] text-on-surface">{qrMug.code}</div>
            <button onClick={() => printMugLabels([qrMug])} className={cn(btnPrimary, 'w-full')}><Printer className="w-4 h-4" /> Imprimir etiqueta</button>
          </div>
        )}
      </Modal>

      {/* Historial */}
      <Modal isOpen={!!historyMug} onClose={() => setHistoryMug(null)} title={`Recargas del vaso ${historyMug?.code ?? ''}`} description={historyMug?.customerName} maxWidth="lg">
        {historyMug && (
          <div className="divide-y divide-outline-variant/60 max-h-[60vh] overflow-y-auto">
            {fills.filter(f => f.mugId === historyMug.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(f => (
              <div key={f.id} className="py-2 flex items-center gap-3 text-sm">
                <div className="w-32 text-on-surface-variant text-xs">{new Date(f.timestamp).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                <div className="flex-1 text-on-surface">{f.productName}</div>
                <div className="w-16 text-right font-bold text-on-surface">{formatLiters(f.volumeMl)}</div>
                <div className="w-24 text-right text-on-surface">{formatMoney(f.amount)}</div>
                <div className="w-16 text-right text-xs font-bold text-primary">+{f.points} pts</div>
              </div>
            ))}
            {fills.every(f => f.mugId !== historyMug.id) && <div className="py-8 text-center text-on-surface-variant font-bold">Sin recargas todavía.</div>}
          </div>
        )}
      </Modal>

      {/* Creación de lockers */}
      <Modal isOpen={!!batch} onClose={() => setBatch(null)} title="Crear lockers" description="Se crean numerados, p. ej. A-1 a A-20" maxWidth="md">
        {batch && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div><label className={labelCls}>Prefijo</label><input className={inputCls} value={batch.prefix} onChange={e => setBatch({ ...batch, prefix: e.target.value })} /></div>
              <div><label className={labelCls}>Desde</label><input type="number" className={inputCls} value={batch.from} onChange={e => setBatch({ ...batch, from: e.target.value })} /></div>
              <div><label className={labelCls}>Hasta</label><input type="number" className={inputCls} value={batch.to} onChange={e => setBatch({ ...batch, to: e.target.value })} /></div>
            </div>
            <div><label className={labelCls}>Abono mensual ($, opcional)</label><input type="number" className={inputCls} value={batch.fee} onChange={e => setBatch({ ...batch, fee: e.target.value })} /></div>
            <button onClick={createBatch} className={cn(btnPrimary, 'w-full')}>Crear</button>
          </div>
        )}
      </Modal>

      {/* Detalle de locker */}
      <Modal isOpen={!!lockerSel} onClose={() => setLockerSel(null)} title={`Locker ${lockerSel?.label ?? ''}`} maxWidth="md">
        {lockerSel && (() => {
          const l = lockers.find(x => x.id === lockerSel.id) || lockerSel;
          const custMugs = mugs.filter(m => m.customerDni === assign.dni.trim() && m.status === 'active');
          const fee = (l.monthlyFee ?? program.defaultLockerFee) || 0;
          return (
            <div className="space-y-4">
              {l.status === 'assigned' ? (
                <>
                  <div className="rounded-xl bg-surface-container-low p-3 text-sm text-on-surface space-y-1">
                    <div><b>{l.customerName}</b> · DNI {l.customerDni}</div>
                    <div>Vaso: {l.mugId ? mugById.get(l.mugId)?.code ?? '—' : 'sin vaso asignado'}</div>
                    <div>Abono: {l.expiresAt ? <span className={cn(l.expiresAt < today() && 'font-bold text-amber-700')}>vence {l.expiresAt}</span> : 'sin abono'} · {fee ? `${formatMoney(fee)}/mes` : 'sin precio definido'}</div>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div><label className={labelCls}>Meses</label><input type="number" min={1} className={inputCls} value={renew.months} onChange={e => setRenew({ ...renew, months: e.target.value })} /></div>
                    <div><label className={labelCls}>Pago</label><select className={inputCls} value={renew.paymentMethod} onChange={e => setRenew({ ...renew, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}</select></div>
                    <button onClick={() => renewLocker(l)} className={btnPrimary}>Cobrar {fee ? formatMoney(fee * Math.max(1, Number(renew.months) || 1)) : ''}</button>
                  </div>
                  <button onClick={() => releaseLocker(l)} className={cn(btnGhost, 'w-full text-rose-600')}><Unlock className="w-4 h-4" /> Liberar locker</button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={labelCls}>DNI del cliente</label><input className={inputCls} value={assign.dni} onChange={e => setAssign({ ...assign, dni: e.target.value, mugId: '' })} /></div>
                    <div><label className={labelCls}>Vaso</label>
                      <select className={inputCls} value={assign.mugId} onChange={e => setAssign({ ...assign, mugId: e.target.value })}>
                        <option value="">{custMugs.length ? 'Elegí el vaso' : 'Sin vasos'}</option>
                        {custMugs.map(m => <option key={m.id} value={m.id}>{m.code} · {formatLiters(m.capacityMl)}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2"><label className={labelCls}>Abono pago hasta (opcional)</label><input type="date" className={inputCls} value={assign.expiresAt} onChange={e => setAssign({ ...assign, expiresAt: e.target.value })} /></div>
                  </div>
                  <button onClick={assignLocker} className={cn(btnPrimary, 'w-full')}><Lock className="w-4 h-4" /> Asignar</button>
                </>
              )}
              {isAdmin && (
                <button onClick={async () => { await db.lockers.update(l.id!, { status: l.status === 'maintenance' ? 'free' : 'maintenance' }); setLockerSel(null); }}
                  disabled={l.status === 'assigned'} className={cn(btnGhost, 'w-full disabled:opacity-40')}>
                  <Wrench className="w-4 h-4" /> {l.status === 'maintenance' ? 'Quitar de mantenimiento' : 'Poner en mantenimiento'}
                </button>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
