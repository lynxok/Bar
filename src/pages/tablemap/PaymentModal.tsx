import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowRightLeft, CreditCard, Minus, Plus, QrCode, Smartphone, SplitSquareHorizontal, User, Wallet, X } from 'lucide-react';
import { useStore, type OrderItem } from '../../contexts/StoreContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { computeTotals, taxLabel } from '../../lib/pricing';
import { mpIsConfigured } from '../../lib/mercadopago';
import { MercadoPagoQr } from '../../components/payments/MercadoPagoQr';
import { cn } from '../../lib/utils';
import { maybeAutoPrintTicket, printTicket, type TicketData } from '../../lib/printing';
import { Printer } from 'lucide-react';

interface Props {
  tableId: string;
  items: OrderItem[];
  onClose: () => void;
  onPaid: () => void;
}

const METHODS = [
  { id: 'Efectivo', icon: Wallet, label: 'Efectivo' },
  { id: 'Tarjeta', icon: CreditCard, label: 'Tarjeta' },
  { id: 'Transferencia', icon: ArrowRightLeft, label: 'Transf.' },
  { id: 'Billetera', icon: Smartphone, label: 'Billetera' },
];
const MP = 'Mercado Pago';

import { formatMoney } from '../../lib/format';

interface PartState { paymentMethod: string; customerDni: string; tip: string; qty: Record<string, number>; }
const emptyPart = (): PartState => ({ paymentMethod: 'Efectivo', customerDni: '', tip: '', qty: {} });
const money = (n: number) => formatMoney(n);
const round2 = (n: number) => Math.round(n * 100) / 100;


/** Cobro de mesa: una cuenta o dividida (partes iguales / por ítems), con descuento, propina y QR de Mercado Pago. */
export function PaymentModal({ tableId, items, onClose, onPaid }: Props) {
  const { closeOrder, closeOrderSplit } = useStore();
  const { taxRate, pricesIncludeTax } = useBusiness();
  const tax = { taxRate, pricesIncludeTax };

  const [mode, setMode] = useState<'single' | 'split'>('single');
  const [method, setMethod] = useState('Efectivo');
  const [dni, setDni] = useState('');
  const [discount, setDiscount] = useState('');
  const [tip, setTip] = useState('');
  const [mpEnabled, setMpEnabled] = useState(false);
  const [showMpQr, setShowMpQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [splitKind, setSplitKind] = useState<'equal' | 'items'>('equal');
  const [parts, setParts] = useState<PartState[]>([emptyPart(), emptyPart()]);

  useEffect(() => { mpIsConfigured().then(setMpEnabled); }, []);

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const totals = computeTotals(subtotal, tax);
  const discountPct = Math.min(100, Math.max(0, Number(discount) || 0));
  const discountAmount = round2(totals.total * discountPct / 100);
  const toPay = round2(totals.total - discountAmount);
  const tipValue = Math.max(0, Number(tip) || 0);

  // Montos por parte (solo para mostrar; el cálculo definitivo lo hace closeOrderSplit)
  const partAmounts = useMemo(() => {
    if (splitKind === 'equal') {
      const base = Math.floor((toPay / parts.length) * 100) / 100;
      return parts.map((_, i) => i === parts.length - 1 ? round2(toPay - base * (parts.length - 1)) : base);
    }
    return parts.map(p => {
      const sub = items.reduce((a, it) => a + it.price * (p.qty[it.id] || 0), 0);
      const t = computeTotals(sub, tax).total;
      return round2(t - t * discountPct / 100);
    });
  }, [splitKind, parts, items, toPay, discountPct, taxRate, pricesIncludeTax]);

  const unassigned = items.map(it => ({
    ...it, left: it.qty - parts.reduce((a, p) => a + (p.qty[it.id] || 0), 0),
  })).filter(it => it.left !== 0);

  const updatePart = (i: number, patch: Partial<PartState>) =>
    setParts(ps => ps.map((p, j) => j === i ? { ...p, ...patch } : p));

  const changeQty = (i: number, itemId: string, delta: number, max: number) =>
    setParts(ps => ps.map((p, j) => {
      if (j !== i) return p;
      const next = Math.max(0, Math.min(max, (p.qty[itemId] || 0) + delta));
      return { ...p, qty: { ...p.qty, [itemId]: next } };
    }));

  const ticket = (extra: Partial<TicketData> = {}): TicketData => ({
    title: `Mesa ${tableId.replace('T-', '')}`,
    items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
    subtotal, taxLabel: taxLabel(tax), tax: totals.tax, discountPct, discountAmount, total: toPay,
    ...extra,
  });

  const [printMsg, setPrintMsg] = useState('');
  const printPreBill = async () => setPrintMsg((await printTicket(ticket({ preBill: true }))) || 'Pre-cuenta enviada a la impresora.');

  const run = async (fn: () => Promise<unknown>, printed: TicketData) => {
    setBusy(true); setError('');
    try {
      await fn();
      maybeAutoPrintTicket(printed).catch(() => {});
      onPaid();
    } catch (e: any) { setError(e?.message || 'No se pudo cobrar la mesa.'); } finally { setBusy(false); }
  };

  const paySingle = (paymentRef?: string) => run(() => closeOrder(tableId, paymentRef ? MP : method, {
    customerDni: dni || undefined, discountPct, tip: tipValue, paymentRef,
  }), ticket({ tip: tipValue, paymentMethod: paymentRef ? MP : method }));

  const paySplit = () => run(() => closeOrderSplit(tableId, parts.map(p => ({
    paymentMethod: p.paymentMethod,
    customerDni: p.customerDni || undefined,
    tip: Number(p.tip) || 0,
    items: splitKind === 'items'
      ? Object.entries(p.qty).filter(([, q]) => Number(q) > 0).map(([id, qty]) => ({ id, qty: Number(qty) }))
      : undefined,
  })), { discountPct }), ticket({ paymentMethod: `Dividida en ${parts.length} partes` }));

  const canSplit = splitKind === 'equal' || (unassigned.length === 0 && parts.every(p => Object.values(p.qty).some(q => Number(q) > 0)));

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-hidden border border-slate-200 flex flex-col">
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
          <div>
            <h3 className="font-black text-2xl text-slate-900">Cobrar Mesa {tableId}</h3>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setMode('single')} className={cn('px-3 py-1 rounded-full text-xs font-black', mode === 'single' ? 'bg-[#0F6B41] text-white' : 'bg-slate-100 text-slate-600')}>Una cuenta</button>
              <button onClick={() => { setMode('split'); setShowMpQr(false); }} className={cn('px-3 py-1 rounded-full text-xs font-black flex items-center gap-1', mode === 'split' ? 'bg-[#0F6B41] text-white' : 'bg-slate-100 text-slate-600')}>
                <SplitSquareHorizontal className="w-3.5 h-3.5" /> Dividir cuenta
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printPreBill} title="Imprimir pre-cuenta" className="px-3 h-10 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1"><Printer className="w-4 h-4" /> Pre-cuenta</button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-7 h-7" /></button>
          </div>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {/* Resumen común */}
          <div className="bg-[#1E4437] rounded-3xl p-6 text-white space-y-2">
            <div className="flex justify-between text-slate-400 font-bold text-xs uppercase tracking-widest"><span>Consumo</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between text-slate-400 font-bold text-xs uppercase tracking-widest"><span>{taxLabel(tax)}</span><span>{money(totals.tax)}</span></div>
            {discountPct > 0 && <div className="flex justify-between text-amber-300 font-bold text-xs uppercase tracking-widest"><span>Descuento {discountPct}%</span><span>-{money(discountAmount)}</span></div>}
            <div className="h-px bg-slate-800" />
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Total a cobrar</div>
                <div className="text-4xl font-black">{money(toPay)}</div>
              </div>
              {mode === 'single' && tipValue > 0 && (
                <div className="text-right text-emerald-300 text-xs font-bold">+ propina {money(tipValue)}<br />= {money(toPay + tipValue)}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descuento (%)</span>
              <input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0"
                className="w-full h-11 px-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold focus:border-[#0F6B41] outline-none" />
            </label>
            {mode === 'single' && (
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Propina ($)</span>
                <div className="flex gap-1">
                  <input type="number" min={0} value={tip} onChange={e => setTip(e.target.value)} placeholder="0"
                    className="w-full h-11 px-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold focus:border-[#0F6B41] outline-none" />
                  {[10, 15].map(p => (
                    <button key={p} onClick={() => setTip(String(Math.round(toPay * p) / 100))} className="px-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black">{p}%</button>
                  ))}
                </div>
              </label>
            )}
          </div>

          {mode === 'single' && !showMpQr && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...METHODS, ...(mpEnabled ? [{ id: MP, icon: QrCode, label: 'Mercado Pago QR' }] : [])].map(m => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={cn('flex items-center gap-2 p-3 rounded-2xl border-2 transition-all',
                      method === m.id ? 'bg-[#0F6B41] border-[#0F6B41] text-white' : 'bg-slate-50 border-transparent text-slate-600 hover:border-slate-200')}>
                    <m.icon className={cn('h-5 w-5', method === m.id ? 'text-white' : 'text-[#0F6B41] dark:text-emerald-400')} />
                    <span className="text-xs font-black uppercase tracking-wider">{m.label}</span>
                  </button>
                ))}
              </div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input id="global-scanner-focus" type="text" value={dni} onChange={e => setDni(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-[#0F6B41] outline-none"
                  placeholder="DNI para sumar puntos (opcional)" />
              </div>
            </>
          )}

          {mode === 'single' && showMpQr && (
            <MercadoPagoQr amount={round2(toPay + tipValue)} description={`Mesa ${tableId}`} tableId={tableId}
              onApproved={(paymentId) => paySingle(paymentId)} onCancel={() => setShowMpQr(false)} />
          )}

          {mode === 'split' && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center flex-wrap">
                <button onClick={() => setSplitKind('equal')} className={cn('px-3 py-1.5 rounded-xl text-xs font-black', splitKind === 'equal' ? 'bg-[#1E4437] text-white' : 'bg-slate-100 text-slate-600')}>Partes iguales</button>
                <button onClick={() => setSplitKind('items')} className={cn('px-3 py-1.5 rounded-xl text-xs font-black', splitKind === 'items' ? 'bg-[#1E4437] text-white' : 'bg-slate-100 text-slate-600')}>Por ítems</button>
                <div className="ml-auto flex items-center gap-2 text-xs font-bold text-slate-600">
                  Partes:
                  <button onClick={() => setParts(ps => ps.length > 2 ? ps.slice(0, -1) : ps)} className="w-8 h-8 rounded-lg bg-slate-100"><Minus className="w-4 h-4 mx-auto" /></button>
                  <span className="w-6 text-center font-black">{parts.length}</span>
                  <button onClick={() => setParts(ps => ps.length < 20 ? [...ps, emptyPart()] : ps)} className="w-8 h-8 rounded-lg bg-slate-100"><Plus className="w-4 h-4 mx-auto" /></button>
                </div>
              </div>

              {splitKind === 'items' && unassigned.length > 0 && (
                <div className="text-xs font-bold text-amber-700 bg-amber-50 rounded-xl p-3">
                  Falta asignar: {unassigned.map(u => `${u.left}x ${u.name}`).join(', ')}
                </div>
              )}

              {parts.map((p, i) => (
                <div key={i} className="border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900">Parte {i + 1}</span>
                    <span className="font-black text-[#0F6B41] dark:text-emerald-400">{money(partAmounts[i] || 0)}</span>
                  </div>
                  {splitKind === 'items' && (
                    <div className="space-y-1">
                      {items.map(it => {
                        const others = parts.reduce((a, q, j) => j === i ? a : a + (q.qty[it.id] || 0), 0);
                        const max = it.qty - others;
                        return (
                          <div key={it.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">{it.name} <span className="text-slate-400">({money(it.price)})</span></span>
                            <span className="flex items-center gap-1">
                              <button onClick={() => changeQty(i, it.id, -1, max)} className="w-6 h-6 rounded bg-slate-100">-</button>
                              <span className="w-5 text-center font-black">{p.qty[it.id] || 0}</span>
                              <button onClick={() => changeQty(i, it.id, 1, max)} disabled={(p.qty[it.id] || 0) >= max} className="w-6 h-6 rounded bg-slate-100 disabled:opacity-30">+</button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <select value={p.paymentMethod} onChange={e => updatePart(i, { paymentMethod: e.target.value })}
                      className="h-10 px-2 bg-slate-50 rounded-xl text-xs font-bold outline-none">
                      {[...METHODS.map(m => m.id), ...(mpEnabled ? [MP] : [])].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input value={p.customerDni} onChange={e => updatePart(i, { customerDni: e.target.value })} placeholder="DNI (opcional)"
                      className="h-10 px-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" />
                    <input type="number" min={0} value={p.tip} onChange={e => updatePart(i, { tip: e.target.value })} placeholder="Propina $"
                      className="h-10 px-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" />
                  </div>
                </div>
              ))}
              {parts.some(p => p.paymentMethod === MP) && (
                <p className="text-[11px] text-slate-500">En cuenta dividida, "Mercado Pago" se registra como medio de pago; el QR con confirmación automática está disponible en "Una cuenta".</p>
              )}
            </div>
          )}

          {printMsg && <div className="text-xs font-bold text-slate-600 bg-slate-50 rounded-xl p-2">{printMsg}</div>}
          {error && <div className="text-sm font-bold text-rose-700 bg-rose-50 rounded-xl p-3">{error}</div>}

          {!(mode === 'single' && showMpQr) && (
            <button disabled={busy || (mode === 'split' && !canSplit)}
              onClick={() => {
                if (mode === 'split') return paySplit();
                if (method === MP) return setShowMpQr(true);
                return paySingle();
              }}
              className="w-full h-14 bg-[#FA4515] hover:bg-[#E03A0E] text-white rounded-2xl font-black text-lg shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer">
              {busy ? 'Cobrando…' : mode === 'split' ? `COBRAR ${parts.length} PARTES` : method === MP ? 'GENERAR QR DE COBRO' : 'FINALIZAR Y COBRAR'}
              <ArrowRight className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
