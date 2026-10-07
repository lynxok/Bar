// Impresión térmica: ESC/POS por red (TCP 9100) o impresora instalada en el sistema (driver).
// El renderer arma "líneas" (texto, negrita, alineación, tamaño) y acá se convierten al formato
// de cada impresora. Configuración en userData/printers.json.
const fs = require('fs');
const path = require('path');
const net = require('net');

const DEFAULT_CONFIG = {
  printers: [],              // [{ id, name, type: 'network'|'system', host, port, deviceName, width: 80|58 }]
  ticketPrinterId: null,
  kitchenPrinterId: null,    // estación por defecto para comandas
  stations: {},              // { [categoría]: printerId | 'none' }
  autoPrintComandas: false,
  autoPrintTicket: false,
  header: '',
  footer: '¡Gracias por su visita!',
};

const charsFor = (p) => (p && Number(p.width) === 58 ? 32 : 48);

// ---------- ESC/POS ----------
const ESC = 0x1b, GS = 0x1d;
function toCp1252(text) {
  // Latin-1 cubre los caracteres del castellano (á é í ó ú ñ ü ¿ ¡); el resto se reemplaza
  return Buffer.from(String(text).replace(/[^\x0A\x20-\x7E\xA0-\xFF]/g, '?'), 'latin1');
}

function buildEscPos(lines, width) {
  const out = [Buffer.from([ESC, 0x40]), Buffer.from([ESC, 0x74, 16])]; // init + código de página WPC1252
  for (const l of lines) {
    if (l.type === 'separator') { out.push(toCp1252('-'.repeat(width) + '\n')); continue; }
    if (l.type === 'feed') { out.push(Buffer.from([ESC, 0x64, Math.min(10, l.lines || 1)])); continue; }
    if (l.type === 'cut') { out.push(Buffer.from([ESC, 0x64, 3, GS, 0x56, 66, 0])); continue; }
    const align = l.align === 'center' ? 1 : l.align === 'right' ? 2 : 0;
    out.push(Buffer.from([ESC, 0x61, align]));
    out.push(Buffer.from([ESC, 0x45, l.bold ? 1 : 0]));
    out.push(Buffer.from([GS, 0x21, l.size === 'double' ? 0x11 : l.size === 'tall' ? 0x01 : 0x00]));
    out.push(toCp1252(String(l.text ?? '') + '\n'));
  }
  out.push(Buffer.from([ESC, 0x45, 0, GS, 0x21, 0, ESC, 0x61, 0]));
  return Buffer.concat(out);
}

function sendRaw(host, port, data, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: Number(port) || 9100 });
    const timer = setTimeout(() => { socket.destroy(); reject(new Error(`La impresora ${host} no respondió`)); }, timeoutMs);
    socket.on('connect', () => socket.end(data));
    socket.on('close', (hadError) => { clearTimeout(timer); if (!hadError) resolve(true); });
    socket.on('error', (err) => { clearTimeout(timer); reject(new Error(`No se pudo imprimir en ${host}: ${err.message}`)); });
  });
}

// ---------- HTML para impresoras del sistema ----------
const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function buildHtml(lines, widthMm) {
  const body = lines.map(l => {
    if (l.type === 'separator') return '<hr/>';
    if (l.type === 'feed') return '<br/>'.repeat(l.lines || 1);
    if (l.type === 'cut') return '';
    const style = [
      `text-align:${l.align || 'left'}`,
      l.bold ? 'font-weight:bold' : '',
      l.size === 'double' ? 'font-size:18px' : l.size === 'tall' ? 'font-size:15px' : '',
    ].filter(Boolean).join(';');
    return `<div style="${style}">${escHtml(l.text) || '&nbsp;'}</div>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 0; size: ${widthMm}mm auto; }
    body { margin: 0; padding: 2mm; width: ${widthMm - 4}mm; font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; }
    hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
  </style></head><body>${body}</body></html>`;
}

function createPrinting({ userDataPath, BrowserWindow, getMainWindow }) {
  const file = path.join(userDataPath, 'printers.json');
  const read = () => { try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { return { ...DEFAULT_CONFIG }; } };

  function validate(cfg) {
    const c = { ...DEFAULT_CONFIG, ...(cfg || {}) };
    c.printers = (Array.isArray(c.printers) ? c.printers : []).slice(0, 20).map(p => ({
      id: String(p.id || Math.random().toString(36).slice(2, 9)).slice(0, 40),
      name: String(p.name || 'Impresora').slice(0, 60),
      type: p.type === 'system' ? 'system' : 'network',
      host: p.type === 'network' ? String(p.host || '').trim().slice(0, 100) : undefined,
      port: p.type === 'network' ? Math.min(65535, Math.max(1, Number(p.port) || 9100)) : undefined,
      deviceName: p.type === 'system' ? String(p.deviceName || '').slice(0, 200) : undefined,
      width: Number(p.width) === 58 ? 58 : 80,
    }));
    c.header = String(c.header || '').slice(0, 300);
    c.footer = String(c.footer || '').slice(0, 300);
    c.autoPrintComandas = !!c.autoPrintComandas;
    c.autoPrintTicket = !!c.autoPrintTicket;
    c.stations = typeof c.stations === 'object' && c.stations ? c.stations : {};
    return c;
  }

  async function printTo(printer, lines) {
    if (!printer) throw new Error('No hay impresora asignada');
    if (printer.type === 'network') {
      if (!printer.host) throw new Error(`La impresora "${printer.name}" no tiene IP`);
      return sendRaw(printer.host, printer.port, buildEscPos(lines, charsFor(printer)));
    }
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, javascript: false } });
    try {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(buildHtml(lines, printer.width === 58 ? 58 : 80)));
      await new Promise((resolve, reject) => {
        win.webContents.print({ silent: true, printBackground: false, deviceName: printer.deviceName || undefined, margins: { marginType: 'none' } },
          (ok, reason) => ok ? resolve(true) : reject(new Error(`No se pudo imprimir: ${reason}`)));
      });
    } finally {
      if (!win.isDestroyed()) win.destroy();
    }
    return true;
  }

  function sanitizeLines(lines) {
    if (!Array.isArray(lines) || lines.length === 0 || lines.length > 400) throw Object.assign(new Error('Contenido de impresión inválido'), { status: 400 });
    return lines.map(l => ({
      type: ['separator', 'feed', 'cut'].includes(l && l.type) ? l.type : undefined,
      text: l && l.text != null ? String(l.text).slice(0, 200) : '',
      bold: !!(l && l.bold),
      align: ['center', 'right'].includes(l && l.align) ? l.align : 'left',
      size: ['double', 'tall'].includes(l && l.size) ? l.size : undefined,
      lines: l && l.lines ? Number(l.lines) : undefined,
    }));
  }

  return {
    getConfig: read,
    setConfig(cfg) { const c = validate(cfg); fs.writeFileSync(file, JSON.stringify(c, null, 2)); return c; },
    async listSystemPrinters() {
      const w = getMainWindow();
      if (!w) return [];
      const list = await w.webContents.getPrintersAsync();
      return list.map(p => ({ name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault }));
    },
    /** target: 'ticket' | 'kitchen' | id de impresora. category: para elegir la estación de cocina. */
    async print({ target, category, lines }) {
      const cfg = read();
      const clean = sanitizeLines(lines);
      let id = target;
      if (target === 'ticket') id = cfg.ticketPrinterId;
      if (target === 'kitchen') {
        const st = category ? cfg.stations[category] : undefined;
        if (st === 'none') return { skipped: true };
        id = st || cfg.kitchenPrinterId;
      }
      const printer = cfg.printers.find(p => p.id === id);
      if (!printer) return { skipped: true, reason: 'Sin impresora asignada' };
      await printTo(printer, clean);
      return { printed: true, printer: printer.name };
    },
    charsFor: (target) => { const c = read(); const id = target === 'ticket' ? c.ticketPrinterId : c.kitchenPrinterId; return charsFor(c.printers.find(p => p.id === id)); },
  };
}

module.exports = { createPrinting, buildEscPos, buildHtml, sendRaw, toCp1252 };
