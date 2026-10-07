import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { mpCheck, mpCreateQr, newPaymentReference } from '../../lib/mercadopago';
import { formatMoney } from '../../lib/format';


interface Props {
  amount: number;
  description: string;
  tableId: string;
  /** Se llama una sola vez cuando Mercado Pago confirma el pago por el monto correcto */
  onApproved: (paymentId: string) => void;
  onCancel: () => void;
}

/** Muestra el QR de cobro y consulta cada 3 s hasta que el pago queda aprobado. */
export function MercadoPagoQr({ amount, description, tableId, onApproved, onCancel }: Props) {
  const [qrImg, setQrImg] = useState('');
  const [status, setStatus] = useState<string>('creating');
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const reference = newPaymentReference(tableId);
    mpCreateQr(amount, description, reference)
      .then(async qr => {
        if (cancelled) return;
        setQrImg(await QRCode.toDataURL(qr.url, { width: 260, margin: 1 }));
        setStatus('pending');
        timer = setInterval(async () => {
          try {
            const r = await mpCheck(reference, qr.amount);
            if (cancelled || done.current) return;
            setStatus(r.status);
            if (r.status === 'approved' && r.paymentId) {
              done.current = true;
              if (timer) clearInterval(timer);
              onApproved(r.paymentId);
            }
          } catch { /* se reintenta en el próximo ciclo */ }
        }, 3000);
      })
      .catch(e => { if (!cancelled) { setError(e?.message || 'No se pudo generar el cobro'); setStatus('error'); } });
    return () => { cancelled = true; if (timer) clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, description, tableId]);

  const label: Record<string, string> = {
    creating: 'Generando QR…',
    pending: 'Esperando el pago… (se confirma solo)',
    in_process: 'Pago en proceso…',
    rejected: 'El pago fue rechazado. El cliente puede reintentar.',
    cancelled: 'Pago cancelado.',
    amount_mismatch: '⚠️ Se pagó un monto menor al total. Verificá con el cliente.',
    approved: '✅ Pago aprobado',
    error: error,
  };

  return (
    <div className="text-center space-y-4">
      <div className="bg-white rounded-2xl p-4 inline-block border border-slate-200 min-h-[200px] min-w-[200px]">
        {qrImg ? <img src={qrImg} alt="QR Mercado Pago" className="w-56 h-56" /> : <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-sm">{status === 'error' ? '—' : 'Generando…'}</div>}
      </div>
      <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">{formatMoney(amount)}</div>

      <div className={status === 'error' || status === 'rejected' || status === 'amount_mismatch' ? 'text-sm font-bold text-rose-600' : 'text-sm font-bold text-slate-600'}>

        {label[status] || `Estado: ${status}`}
      </div>
      <button onClick={onCancel} className="text-xs font-bold text-slate-500 underline">Cancelar y elegir otro medio de pago</button>
    </div>
  );
}
