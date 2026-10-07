// Recarga de vaso propio: se escanea el QR del vaso (o se tipea el código),
// se elige la cerveza y la carga, y se agrega la línea al pedido.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Html5Qrcode } from 'html5-qrcode';
import { Beer, Camera, CameraOff, Search, Trophy } from 'lucide-react';
import { db, type Mug } from '../../db/database';
import { buildFillItem, fillPrice, formatLiters, getMugProgram, nextMilestone, parseMugCode } from '../../lib/mugs';
import { formatMoney } from '../../lib/format';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: ReturnType<typeof buildFillItem>) => void;
}

const READER_ID = 'mug-qr-reader';

export function MugFillModal({ isOpen, onClose, onAdd }: Props) {
  const config = useLiveQuery(() => db.loyaltyConfig.get('global'), []);
  const program = getMugProgram(config);
  const [codeInput, setCodeInput] = useState('');
  const [mug, setMug] = useState<Mug | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productIdx, setProductIdx] = useState(0);
  const [volumeMl, setVolumeMl] = useState(0);
  const [applyDiscount, setApplyDiscount] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const ownerMl = useLiveQuery(async () => {
    if (!mug) return 0;
    const mugs = await db.mugs.where('customerDni').equals(mug.customerDni).toArray();
    return mugs.reduce((a, m) => a + (m.totalMl || 0), 0);
  }, [mug?.customerDni]) || 0;
  const locker = useLiveQuery(() => (mug?.lockerId ? db.lockers.get(mug.lockerId) : undefined), [mug?.lockerId]);

  const stopCamera = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    setCameraOn(false);
    if (s) { try { await s.stop(); s.clear(); } catch { /* ya detenido */ } }
  };

  const reset = () => { setMug(null); setCodeInput(''); setError(null); setVolumeMl(0); setProductIdx(0); setApplyDiscount(true); };

  useEffect(() => { if (!isOpen) { stopCamera(); reset(); } }, [isOpen]);
  useEffect(() => () => { stopCamera(); }, []);

  const lookup = async (raw: string) => {
    const code = parseMugCode(raw);
    if (!code) { setError('Código de vaso inválido.'); return; }
    const found = await db.mugs.where('code').equals(code).first();
    if (!found) { setError(`No hay ningún vaso con el código ${code}.`); return; }
    if (found.status !== 'active') { setError(`El vaso ${code} está ${found.status === 'lost' ? 'marcado como perdido' : 'dado de baja'}.`); return; }
    setError(null);
    setMug(found);
    setVolumeMl(found.capacityMl);
    await stopCamera();
  };

  const startCamera = async () => {
    setError(null);
    setCameraOn(true);
    setTimeout(async () => {
      try {
        const s = new Html5Qrcode(READER_ID);
        scannerRef.current = s;
        await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => { const z = Math.min(w, h) * 0.7; return { width: z, height: z }; } },
          text => { lookup(text); }, () => {});
      } catch (e: any) {
        setCameraOn(false);
        setError('No se pudo abrir la cámara. Tipeá el código impreso en el vaso.');
      }
    }, 50);
  };

  const product = program.fillProducts[productIdx];
  const discount = applyDiscount ? program.holderDiscountPct : 0;
  const price = product ? fillPrice(product.pricePerLiter, volumeMl, discount) : 0;
  const next = nextMilestone(program, ownerMl);
  const volumeOptions = useMemo(() => {
    if (!mug) return [];
    const c = mug.capacityMl;
    return Array.from(new Set([c, Math.round(c / 2)])).filter(v => v > 0);
  }, [mug]);

  const add = () => {
    if (!mug || !product) return;
    onAdd(buildFillItem({ mug, product, volumeMl, holderDiscountPct: discount }));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { stopCamera(); onClose(); }} title="Recarga de vaso" description="Escaneá el QR del vaso del cliente" maxWidth="lg">
      {!mug ? (
        <div className="space-y-4">
          <div id={READER_ID} className={cn('w-full rounded-2xl overflow-hidden bg-black', cameraOn ? 'min-h-[260px]' : 'hidden')} />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <input autoFocus value={codeInput} onChange={e => setCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookup(codeInput)}
                placeholder="Código del vaso (o usá un lector)"
                className="w-full h-12 pl-10 pr-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button onClick={() => lookup(codeInput)} className="h-12 px-4 rounded-xl bg-primary text-on-primary font-bold">Buscar</button>
          </div>
          <button onClick={cameraOn ? stopCamera : startCamera}
            className="w-full h-12 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface font-bold flex items-center justify-center gap-2">
            {cameraOn ? <><CameraOff className="h-5 w-5" /> Cerrar cámara</> : <><Camera className="h-5 w-5" /> Escanear con la cámara</>}
          </button>
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Beer className="h-6 w-6" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-lg text-on-surface truncate">{mug.customerName}</div>
              <div className="text-xs text-on-surface-variant">
                Vaso {mug.code} · {formatLiters(mug.capacityMl)}{mug.model ? ` · ${mug.model}` : ''}{locker ? ` · Locker ${locker.label}` : ''}
              </div>
              <div className="mt-2 text-sm text-on-surface"><b>{formatLiters(ownerMl)}</b> acumulados · {mug.fillCount} recargas de este vaso</div>
              {next && (
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] font-bold text-on-surface-variant">
                    <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> {next.label}</span>
                    <span>{formatLiters(ownerMl)} / {next.liters} L</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-container mt-1 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, ownerMl / (next.liters * 10))}%` }} />
                  </div>
                </div>
              )}
              {locker?.expiresAt && locker.expiresAt < new Date().toISOString().split('T')[0] && (
                <div className="mt-2 text-xs font-bold text-amber-700">El abono del locker venció el {locker.expiresAt}.</div>
              )}
            </div>
            <button onClick={reset} className="text-xs font-bold text-primary">Cambiar</button>
          </div>

          {program.fillProducts.length === 0 ? (
            <p className="text-sm font-bold text-amber-700">Todavía no hay cervezas habilitadas para recarga. Cargalas en Vasos y Lockers → Configuración.</p>
          ) : (
            <>
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-on-surface-variant mb-2">Cerveza</div>
                <div className="grid grid-cols-2 gap-2">
                  {program.fillProducts.map((p, i) => (
                    <button key={p.productId} onClick={() => setProductIdx(i)}
                      className={cn('p-3 rounded-xl border text-left', i === productIdx ? 'border-primary bg-primary/10' : 'border-outline-variant bg-surface-container-lowest')}>
                      <div className="font-bold text-sm text-on-surface">{p.name}</div>
                      <div className="text-xs text-on-surface-variant">{formatMoney(p.pricePerLiter)} / L</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-on-surface-variant mb-2">Carga</div>
                <div className="flex gap-2">
                  {volumeOptions.map(v => (
                    <button key={v} onClick={() => setVolumeMl(v)}
                      className={cn('flex-1 h-11 rounded-xl border font-bold text-sm', v === volumeMl ? 'border-primary bg-primary/10 text-on-surface' : 'border-outline-variant text-on-surface-variant')}>
                      {v === mug.capacityMl ? 'Completa' : 'Media'} · {formatLiters(v)}
                    </button>
                  ))}
                </div>
              </div>
              {program.holderDiscountPct > 0 && (
                <label className="flex items-center gap-2 text-sm text-on-surface">
                  <input type="checkbox" checked={applyDiscount} onChange={e => setApplyDiscount(e.target.checked)} />
                  Precio de socio (−{program.holderDiscountPct}%)
                </label>
              )}
              <button onClick={add} disabled={!product}
                className="w-full h-14 rounded-2xl bg-primary text-on-primary font-black text-lg flex items-center justify-between px-6 disabled:opacity-50">
                <span>Agregar recarga</span><span>{formatMoney(price)}</span>
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
