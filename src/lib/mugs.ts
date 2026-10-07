// Reglas del programa de vasos propios: códigos QR, precio de recarga, puntos e hitos.
// Sin React ni base de datos para poder testearlas aisladas.
import type { LoyaltyConfig, MugProgramConfig } from '../db/database';

export const MUG_QR_PREFIX = 'LYNX-MUG:';

export const DEFAULT_MUG_PROGRAM: MugProgramConfig = {
  pointsMode: 'per_liter',
  pointsPerLiter: 10,
  holderDiscountPct: 0,
  fillProducts: [],
  milestones: [
    { liters: 50, bonusPoints: 200, label: 'Bronce cervecero' },
    { liters: 100, bonusPoints: 500, label: 'Stammgast' },
    { liters: 250, bonusPoints: 1500, label: 'Leyenda de la barra' },
  ],
  defaultLockerFee: 0,
};

export const getMugProgram = (config?: Pick<LoyaltyConfig, 'mugProgram'> | null): MugProgramConfig => ({
  ...DEFAULT_MUG_PROGRAM,
  ...(config?.mugProgram || {}),
});

// Sin 0/O/1/I/L para que se pueda tipear sin confusiones si el QR no lee
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const generateMugCode = (length = 6): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
};

export const mugQrPayload = (code: string) => `${MUG_QR_PREFIX}${code}`;

/** Acepta el texto del QR ("LYNX-MUG:7F3K9Q"), una URL que termine en el código o el código tipeado a mano. */
export const parseMugCode = (raw: string): string | null => {
  let t = String(raw || '').trim().toUpperCase();
  if (!t) return null;
  if (t.startsWith(MUG_QR_PREFIX)) t = t.slice(MUG_QR_PREFIX.length);
  else if (t.includes('/')) t = t.split('/').filter(Boolean).pop() || '';
  t = t.replace(/[^A-Z0-9]/g, '');
  return t.length >= 4 && t.length <= 12 ? t : null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const fillPrice = (pricePerLiter: number, volumeMl: number, holderDiscountPct = 0) => {
  const pct = Math.min(100, Math.max(0, Number(holderDiscountPct) || 0));
  return round2((Number(pricePerLiter) || 0) * (volumeMl / 1000) * (1 - pct / 100));
};

/** Puntos de una recarga. `amountPaid` es lo efectivamente cobrado por esa recarga (con descuentos/impuestos). */
export const fillPoints = (program: MugProgramConfig, volumeMl: number, amountPaid: number, multiplier = 1) => {
  const base = program.pointsMode === 'per_peso'
    ? amountPaid / 100
    : (volumeMl / 1000) * (Number(program.pointsPerLiter) || 0);
  return Math.max(0, Math.floor(base * (multiplier || 1)));
};

/** Hitos que se cruzan al pasar de `beforeMl` a `afterMl` litros acumulados. */
export const crossedMilestones = (program: MugProgramConfig, beforeMl: number, afterMl: number) =>
  [...program.milestones]
    .sort((a, b) => a.liters - b.liters)
    .filter(m => m.liters * 1000 > beforeMl && m.liters * 1000 <= afterMl);

export const nextMilestone = (program: MugProgramConfig, totalMl: number) =>
  [...program.milestones].sort((a, b) => a.liters - b.liters).find(m => m.liters * 1000 > totalMl) || null;

export const formatLiters = (ml: number) => {
  const l = (ml || 0) / 1000;
  return `${l.toLocaleString('es-AR', { maximumFractionDigits: l < 10 ? 2 : 1 })} L`;
};

/** Multiplicador vigente según las promociones activas del programa de fidelidad. */
export const activeMultiplier = (config: Pick<LoyaltyConfig, 'promotions'> | null | undefined, isoDate: string) => {
  const day = isoDate.split('T')[0];
  let m = 1;
  for (const p of config?.promotions || []) {
    if (!p.active) continue;
    if (p.startDate && day < p.startDate) continue;
    if (p.endDate && day > p.endDate) continue;
    m = Math.max(m, p.multiplier);
  }
  return m;
};

/** Datos de recarga que viajan dentro de la línea del pedido hasta el cobro. */
export interface MugFillLine {
  mugId: number;
  mugCode: string;
  ownerDni: string;
  ownerName: string;
  volumeMl: number;
}

export const buildFillItem = (params: {
  mug: { id?: number; code: string; customerDni: string; customerName: string };
  product: { productId: number; name: string; pricePerLiter: number };
  volumeMl: number;
  holderDiscountPct: number;
}) => {
  const { mug, product, volumeMl, holderDiscountPct } = params;
  const liters = volumeMl / 1000;
  const mugFill: MugFillLine = {
    mugId: mug.id!, mugCode: mug.code, ownerDni: mug.customerDni, ownerName: mug.customerName, volumeMl,
  };
  return {
    // id único: cada recarga es una línea propia (no se agrupa con otras)
    id: `MUG-${mug.code}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    productId: product.productId,
    name: `Recarga ${liters.toLocaleString('es-AR')} L · ${product.name} (vaso ${mug.code})`,
    price: fillPrice(product.pricePerLiter, volumeMl, holderDiscountPct),
    qty: 1,
    category: 'Recarga de vaso',
    mugFill,
  };
};

export const isFillItem = (item: any): item is { mugFill: MugFillLine } => !!item?.mugFill?.mugId;
