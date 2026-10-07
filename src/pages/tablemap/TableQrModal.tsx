import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import QRCode from 'qrcode';
import { clientTableUrl, getShareableBaseUrl } from '../../lib/publicUrl';

interface Props {
  tableId: string;
  onClose: () => void;
}

/** QR de una mesa para que los comensales vean la carta y pidan desde su celular. */
export function TableQrModal({ tableId, onClose }: Props) {
  const [link, setLink] = useState('');
  const [source, setSource] = useState<string>('');
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    getShareableBaseUrl().then(({ url, source }) => {
      if (cancelled) return;
      const l = clientTableUrl(url, tableId);
      setLink(l);
      setSource(source);
      QRCode.toDataURL(l, { width: 300, margin: 2 })
        .then(data => { if (!cancelled) setQrUrl(data); })
        .catch(err => console.error(err));
    });
    return () => { cancelled = true; };
  }, [tableId]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR_Mesa_${tableId}.png`;
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Mesa ${tableId}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0; }
            img { width: 300px; height: 300px; }
            h1 { margin-top: 20px; font-size: 24px; color: #1e293b; }
            p { font-size: 14px; color: #64748b; margin-top: 5px; }
          </style>
        </head>
        <body>
          <img src="${qrUrl}" />
          <h1>MESA ${tableId}</h1>
          <p>Escanea para ver la carta y pedir</p>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h4 className="font-black text-xl text-slate-900">Código QR - Mesa {tableId}</h4>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"><X className="w-6 h-6" /></button>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl flex justify-center border border-slate-100 shadow-inner">
          {qrUrl ? (
            <img src={qrUrl} alt={`QR Mesa ${tableId}`} className="w-64 h-64 mix-blend-multiply" />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-sm">Generando...</div>
          )}
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Enlace: <span className="font-mono text-[10px] break-all">{link}</span>
        </p>
        {source === 'lan' && (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl p-2 font-bold">
            Este QR funciona con celulares conectados al WiFi del local. Para que funcione con datos móviles, activá el túnel en Configuración → Red.
          </p>
        )}
        {source === 'none' && (
          <p className="text-[11px] text-rose-700 bg-rose-50 rounded-xl p-2 font-bold">
            No se detectó una red local: el QR no va a funcionar desde otros celulares.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button onClick={handleDownload} disabled={!qrUrl}
            className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
            Descargar
          </button>
          <button onClick={handlePrint} disabled={!qrUrl}
            className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50">
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
