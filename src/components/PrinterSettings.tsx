import { useEffect, useMemo, useState } from 'react';
import { Plus, Printer, Save, Trash2 } from 'lucide-react';
import { getIpc } from '../lib/ipc';
import { getPrinterConfig, printComanda, printTicket, savePrinterConfig, type PrinterConfig, type PrinterTarget } from '../lib/printing';
import { useStore } from '../contexts/StoreContext';

const newPrinter = (): PrinterTarget => ({ id: Math.random().toString(36).slice(2, 9), name: 'Cocina', type: 'network', host: '', port: 9100, width: 80 });

/** Impresoras térmicas: alta, asignación de ticket/cocina/estaciones e impresión automática. */
export function PrinterSettings() {
  const { products } = useStore();
  const [cfg, setCfg] = useState<PrinterConfig | null>(null);
  const [systemPrinters, setSystemPrinters] = useState<{ name: string; displayName: string }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);

  useEffect(() => {
    getPrinterConfig(true).then(setCfg);
    getIpc()?.invoke('printers-list').then(setSystemPrinters).catch(() => setSystemPrinters([]));
  }, []);

  if (!cfg) return <div className="p-6 text-slate-400">Cargando…</div>;

  const update = (patch: Partial<PrinterConfig>) => setCfg({ ...cfg, ...patch });
  const updatePrinter = (id: string, patch: Partial<PrinterTarget>) =>
    update({ printers: cfg.printers.map(p => p.id === id ? { ...p, ...patch } : p) });

  const save = async () => {
    try { setCfg(await savePrinterConfig(cfg)); setMsg({ ok: true, text: 'Configuración guardada.' }); }
    catch (e: any) { setMsg({ ok: false, text: e?.message || 'No se pudo guardar' }); }
  };

  const test = async (p: PrinterTarget) => {
    setMsg(null);
    try {
      await savePrinterConfig(cfg);
      const r = await getIpc()!.invoke<{ printed?: boolean }>('print-lines', {
        target: p.id,
        lines: [{ text: 'PRUEBA DE IMPRESIÓN', align: 'center', bold: true, size: 'double' }, { text: p.name, align: 'center' },
          { type: 'separator' }, { text: 'Ñandú, café, acción: ¡OK!' }, { type: 'cut' }],
      });
      setMsg({ ok: !!r.printed, text: r.printed ? `Se envió una prueba a "${p.name}".` : 'No se imprimió.' });
    } catch (e: any) {
      setMsg({ ok: false, text: String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '') });
    }
  };

  const select = (value: string | null, onChange: (v: string | null) => void, allowNone = false) => (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)} className="h-10 px-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold">
      <option value="">{allowNone ? 'Usar la de cocina por defecto' : '— Sin asignar —'}</option>
      {allowNone && <option value="none">No imprimir</option>}
      {cfg.printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2"><Printer className="w-5 h-5 text-brand dark:text-emerald-400" /> Impresoras</h3>
          <button onClick={() => update({ printers: [...cfg.printers, newPrinter()] })} className="px-3 h-9 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1 transition-colors"><Plus className="w-4 h-4" /> Agregar</button>
        </div>
        <p className="text-xs text-slate-500">
          <b>De red</b>: impresoras térmicas con IP (Epson, Xprinter, 3nStar…), puerto 9100, comandos ESC/POS.
          <b> Del sistema</b>: cualquier impresora instalada en Windows (USB), imprime por el driver.
        </p>
        {cfg.printers.length === 0 && <div className="text-sm text-slate-400 font-bold">Todavía no agregaste impresoras.</div>}
        {cfg.printers.map(p => (
          <div key={p.id} className="grid grid-cols-12 gap-2 items-center border border-slate-100 dark:border-white/10 rounded-xl p-3">
            <input value={p.name} onChange={e => updatePrinter(p.id, { name: e.target.value })} className="col-span-3 h-10 px-3 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-sm" placeholder="Nombre" />
            <select value={p.type} onChange={e => updatePrinter(p.id, { type: e.target.value as any })} className="col-span-2 h-10 px-2 rounded-xl bg-slate-50 dark:bg-white/5 text-sm font-bold">
              <option value="network">De red</option>
              <option value="system">Del sistema</option>
            </select>
            {p.type === 'network' ? (
              <>
                <input value={p.host || ''} onChange={e => updatePrinter(p.id, { host: e.target.value })} className="col-span-3 h-10 px-3 rounded-xl bg-slate-50 dark:bg-white/5 font-mono text-sm" placeholder="192.168.0.50" />
                <input type="number" value={p.port || 9100} onChange={e => updatePrinter(p.id, { port: Number(e.target.value) })} className="col-span-1 h-10 px-2 rounded-xl bg-slate-50 dark:bg-white/5 font-mono text-sm" />
              </>
            ) : (
              <select value={p.deviceName || ''} onChange={e => updatePrinter(p.id, { deviceName: e.target.value })} className="col-span-4 h-10 px-2 rounded-xl bg-slate-50 dark:bg-white/5 text-sm">
                <option value="">Impresora predeterminada</option>
                {systemPrinters.map(sp => <option key={sp.name} value={sp.name}>{sp.displayName}</option>)}
              </select>
            )}
            <select value={p.width} onChange={e => updatePrinter(p.id, { width: Number(e.target.value) as 80 | 58 })} className="col-span-1 h-10 px-1 rounded-xl bg-slate-50 dark:bg-white/5 text-sm font-bold">
              <option value={80}>80mm</option>
              <option value={58}>58mm</option>
            </select>
            <button onClick={() => test(p)} className="col-span-1 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-brand dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors">Prueba</button>
            <button onClick={() => update({ printers: cfg.printers.filter(x => x.id !== p.id) })} className="col-span-1 h-10 rounded-xl text-rose-500 hover:bg-rose-50 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <h3 className="font-black text-slate-900 dark:text-white">Asignaciones</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Tickets y pre-cuentas</span>{select(cfg.ticketPrinterId, v => update({ ticketPrinterId: v }))}</label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Comandas (cocina por defecto)</span>{select(cfg.kitchenPrinterId, v => update({ kitchenPrinterId: v }))}</label>
        </div>
        {categories.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Estación por categoría (por ejemplo, Bebidas a la barra)</span>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(c => (
                <label key={c} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-1.5">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{c}</span>
                  {select(cfg.stations[c] || null, v => { const s = { ...cfg.stations }; if (v) s[c] = v; else delete s[c]; update({ stations: s }); }, true)}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={cfg.autoPrintComandas} onChange={e => update({ autoPrintComandas: e.target.checked })} className="w-4 h-4 accent-brand" />
            Imprimir comandas automáticamente al enviarlas a cocina (también las de los mozos)
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={cfg.autoPrintTicket} onChange={e => update({ autoPrintTicket: e.target.checked })} className="w-4 h-4 accent-brand" />
            Imprimir comprobante automáticamente al cobrar en esta PC
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Encabezado del ticket (dirección, CUIT…)</span>
            <textarea rows={3} value={cfg.header} onChange={e => update({ header: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white" /></label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Pie del ticket</span>
            <textarea rows={3} value={cfg.footer} onChange={e => update({ footer: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white" /></label>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={save} className="px-4 h-10 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold flex items-center gap-2 transition-colors"><Save className="w-4 h-4" /> Guardar</button>
          <button onClick={async () => { await savePrinterConfig(cfg); const err = await printTicket({ title: 'Mesa 1', items: [{ name: 'Producto de prueba', qty: 2, price: 1500 }], subtotal: 3000, total: 3000, paymentMethod: 'Efectivo', preBill: true }); setMsg({ ok: !err, text: err || 'Ticket de prueba enviado.' }); }}
            className="px-4 h-10 rounded-xl bg-slate-100 text-sm font-bold">Probar ticket</button>
          <button onClick={async () => { await savePrinterConfig(cfg); await printComanda({ tableId: 'T-1', items: products.slice(0, 3).map(p => ({ productId: p.id, name: p.name, qty: 1 })) }); setMsg({ ok: true, text: 'Comanda de prueba enviada a las estaciones.' }); }}
            className="px-4 h-10 rounded-xl bg-slate-100 text-sm font-bold">Probar comanda</button>
          {msg && <span className={msg.ok ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-rose-700'}>{msg.text}</span>}
        </div>
      </div>
    </div>
  );
}
