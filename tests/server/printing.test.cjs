// Pruebas de impresión ESC/POS con una "impresora" TCP simulada.
const net = require('net');
const { buildEscPos, sendRaw, toCp1252, buildHtml } = require('../../electron/printing.cjs');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
(async () => {
  const bytes = buildEscPos([
    { text: 'MESA 5', bold: true, align: 'center', size: 'double' },
    { type: 'separator' },
    { text: '2 x Ñoquis con salsa' },
    { type: 'cut' },
  ], 48);
  ok(bytes[0] === 0x1b && bytes[1] === 0x40, 'arranca con ESC @ (inicializar)');
  ok(bytes.includes(Buffer.from([0x1b, 0x74, 16])), 'selecciona código de página WPC1252');
  ok(bytes.includes(Buffer.from([0x1b, 0x45, 1])), 'negrita');
  ok(bytes.includes(Buffer.from([0x1d, 0x21, 0x11])), 'doble tamaño');
  ok(bytes.includes(Buffer.from([0x1d, 0x56, 66, 0])), 'corte de papel');
  ok(bytes.includes(Buffer.from([0xd1])), 'la Ñ se codifica en Latin-1 (0xD1)');
  ok(bytes.includes(toCp1252('-'.repeat(48))), 'separador al ancho de 80 mm (48 caracteres)');
  ok(toCp1252('Café 🍕').toString('latin1') === 'Café ??', 'emojis se reemplazan sin romper la impresión');
  ok(buildHtml([{ text: '<script>' }], 80).includes('&lt;script&gt;'), 'HTML para impresora del sistema escapado');

  let received = Buffer.alloc(0);
  const server = net.createServer(s => s.on('data', d => { received = Buffer.concat([received, d]); }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  await sendRaw('127.0.0.1', server.address().port, bytes);
  await new Promise(r => setTimeout(r, 100));
  ok(received.equals(bytes), 'envía los bytes completos por TCP (puerto 9100 simulado)');
  server.close();
  let err = null;
  try { await sendRaw('127.0.0.1', 1, bytes, 1500); } catch (e) { err = e; }
  ok(err && /No se pudo imprimir|no respondió/.test(err.message), 'impresora apagada -> error claro');
  console.log(`\n${pass} OK, ${fail} fallidos`);
  process.exit(fail ? 1 : 0);
})();
