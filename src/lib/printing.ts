// Armado de comandas y tickets para impresoras térmicas.
// En la PC principal se imprime por IPC; en celulares/tablets, por la API del host.
import { getIpc } from './ipc';
import { apiFetch } from './auth';
import { db } from '../db/database';

export type PrintLine =
  | { type?: undefined; text: string; bold?: boolean; align?: 'left' | 'center' | 'right'; size?: 'double' | 'tall' }
  | { type: 'separator' } | { type: 'cut' } | { type: 'feed'; lines?: number };

export interface PrinterTarget { id: string; name: string; type: 'network' | 'system'; host?: string; port?: number; deviceName?: string; width: 80 | 58; }
export interface PrinterConfig {
  printers: PrinterTarget[]; ticketPrinterId: string | null; kitchenPrinterId: string | null;
  stations: Record<string, string>; autoPrintComandas: boolean; autoPrintTicket: boolean; header: string; footer: string;
}

const money = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function twoCols(left: string, right: string, width: number) {
  const r = right.slice(0, width);
  const maxLeft = Math.max(1, width - r.length - 1);
  const l = left.length > maxLeft ? left.slice(0, maxLeft - 1) + '…' : left;
  return l + ' '.repeat(Math.max(1, width - l.length - r.length)) + r;
}

let cachedConfig: { at: number; cfg: PrinterConfig } | null = null;
export async function getPrinterConfig(force = false): Promise<PrinterConfig | null> {
  const ipc = getIpc();
  if (!ipc) return null;
  if (!force && cachedConfig && Date.now() - cachedConfig.at < 30_000) return cachedConfig.cfg;
  const cfg = await ipc.invoke<PrinterConfig>('printer-config-get');
  cachedConfig = { at: Date.now(), cfg };
  return cfg;
}
export async function savePrinterConfig(cfg: PrinterConfig) {
  const saved = await getIpc()!.invoke<PrinterConfig>('printer-config-set', cfg);
  cachedConfig = { at: Date.now(), cfg: saved };
  return saved;
}

async function sendLines(target: string, lines: PrintLine[], category?: string) {
  const ipc = getIpc();
  if (ipc) return ipc.invoke<{ printed?: boolean; skipped?: boolean; reason?: string }>('print-lines', { target, category, lines });
  return apiFetch<{ printed?: boolean; skipped?: boolean; reason?: string }>('/api/print', { method: 'POST', body: JSON.stringify({ target, category, lines }) });
}

const nowLabel = () => new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

// ---------- Comandas ----------
export function comandaLines(tableId: string, items: any[], station: string): PrintLine[] {
  const lines: PrintLine[] = [
    { text: station.toUpperCase(), align: 'center', bold: true },
    { text: tableId === 'POS_FAST' ? 'MOSTRADOR' : `MESA ${tableId.replace('T-', '')}`, align: 'center', bold: true, size: 'double' },
    { text: nowLabel(), align: 'center' },
    { type: 'separator' },
  ];
  for (const it of items) {
    lines.push({ text: `${it.qty || 1} x ${it.name}`, bold: true, size: 'tall' });
    if (it.note) lines.push({ text: `   > ${it.note}` });
  }
  lines.push({ type: 'separator' }, { type: 'cut' });
  return lines;
}

/** Imprime una comanda separada por estación (categoría del producto). Solo en la PC principal. */
export async function printComanda(comanda: { tableId: string; items: any[] }, opts: { onlyIfAuto?: boolean } = {}) {
  const cfg = await getPrinterConfig();
  if (!cfg || (opts.onlyIfAuto && !cfg.autoPrintComandas)) return;
  const groups = new Map<string, any[]>();
  for (const it of comanda.items || []) {
    const pid = it.productId ?? (/^\d+$/.test(String(it.id ?? '')) ? Number(it.id) : undefined);
    const product = pid != null ? await db.products.get(pid) : await db.products.where('name').equals(it.name).first();
    const category = product?.category || 'General';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(it);
  }
  // Agrupar categorías que van a la misma impresora en un solo papel
  const byPrinter = new Map<string, { categories: string[]; items: any[] }>();
  for (const [category, items] of groups) {
    const station = cfg.stations[category];
    if (station === 'none') continue;
    const printerId = station || cfg.kitchenPrinterId;
    if (!printerId) continue;
    const g = byPrinter.get(printerId) || { categories: [], items: [] };
    g.categories.push(category);
    g.items.push(...items);
    byPrinter.set(printerId, g);
  }
  for (const [printerId, g] of byPrinter) {
    const name = cfg.printers.find(p => p.id === printerId)?.name || g.categories.join(' / ');
    await sendLines(printerId, comandaLines(comanda.tableId, g.items, name));
  }
}

// ---------- Tickets ----------
export interface TicketData {
  title: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  taxLabel?: string;
  tax?: number;
  taxIncluded?: boolean;
  discountPct?: number;
  discountAmount?: number;
  total: number;
  tip?: number;
  paymentMethod?: string;
  preBill?: boolean;
}

export function ticketLines(t: TicketData, width: number, header: string, footer: string): PrintLine[] {
  const business = (() => { try { return localStorage.getItem('bar_businessName') || ''; } catch { return ''; } })();
  const lines: PrintLine[] = [];
  if (business) lines.push({ text: business, align: 'center', bold: true, size: 'double' });
  for (const h of (header || '').split('\n').filter(Boolean)) lines.push({ text: h, align: 'center' });
  lines.push({ text: t.preBill ? 'PRE-CUENTA' : 'COMPROBANTE DE PAGO', align: 'center', bold: true });
  lines.push({ text: `${t.title} - ${nowLabel()}`, align: 'center' }, { type: 'separator' });
  for (const it of t.items) lines.push({ text: twoCols(`${it.qty} x ${it.name}`, money(it.price * it.qty), width) });
  lines.push({ type: 'separator' });
  lines.push({ text: twoCols('Subtotal', money(t.subtotal), width) });
  if (t.tax && t.taxLabel) lines.push({ text: twoCols(t.taxLabel, money(t.tax), width) });
  if (t.discountAmount) lines.push({ text: twoCols(`Descuento ${t.discountPct || ''}%`, `-${money(t.discountAmount)}`, width) });
  lines.push({ text: twoCols('TOTAL', money(t.total), width), bold: true, size: 'tall' });
  if (t.tip) lines.push({ text: twoCols('Propina', money(t.tip), width) });
  if (t.paymentMethod) lines.push({ text: twoCols('Pago', t.paymentMethod, width) });
  lines.push({ type: 'separator' });
  for (const f of (footer || '').split('\n').filter(Boolean)) lines.push({ text: f, align: 'center' });
  lines.push({ text: 'DOCUMENTO NO VÁLIDO COMO FACTURA', align: 'center' }, { type: 'cut' });
  return lines;
}

/** Imprime un ticket en la impresora de tickets. Devuelve un mensaje si no se pudo. */
export async function printTicket(t: TicketData): Promise<string | null> {
  try {
    let width = 48, header = '', footer = '';
    const cfg = await getPrinterConfig();
    if (cfg) {
      const p = cfg.printers.find(x => x.id === cfg.ticketPrinterId);
      if (!p) return 'No hay impresora de tickets configurada (Configuración → Impresoras).';
      width = p.width === 58 ? 32 : 48; header = cfg.header; footer = cfg.footer;
    } else {
      const remote = await apiFetch<{ ticketWidth: number; header: string; footer: string; hasTicketPrinter: boolean }>('/api/print/config');
      if (!remote.hasTicketPrinter) return 'No hay impresora de tickets configurada en la PC principal.';
      width = remote.ticketWidth; header = remote.header; footer = remote.footer;
    }
    const r = await sendLines('ticket', ticketLines(t, width, header, footer));
    return r.skipped ? (r.reason || 'No se imprimió') : null;
  } catch (e: any) {
    return e?.message || 'No se pudo imprimir';
  }
}

/** Ticket automático al cobrar, si está activado en la configuración. */
export async function maybeAutoPrintTicket(t: TicketData) {
  const cfg = await getPrinterConfig().catch(() => null);
  if (cfg?.autoPrintTicket) return printTicket(t);
  return null;
}
