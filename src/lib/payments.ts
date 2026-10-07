// Clasificación única de medios de pago para el cierre de caja.
export type PaymentBucket = 'cash' | 'card' | 'transfer';

/** Efectivo, tarjeta o digital (transferencia, QR, billetera, Mercado Pago). */
export function classifyPaymentMethod(method?: string): PaymentBucket {
  const m = (method || '').toLowerCase().trim();
  if (!m || m.includes('efectivo') || m === 'cash') return 'cash';
  if (m.includes('tarjeta') || m === 'card' || m.includes('débito') || m.includes('debito') || m.includes('crédito') || m.includes('credito')) return 'card';
  return 'transfer';
}

export function sumByPaymentBucket(orders: { paymentMethod?: string; total: number }[]) {
  return orders.reduce((acc, o) => {
    acc[classifyPaymentMethod(o.paymentMethod)] += o.total || 0;
    return acc;
  }, { cash: 0, card: 0, transfer: 0 });
}

/**
 * Resumen de caja de un turno. Las propinas se informan aparte; las propinas en efectivo
 * están físicamente en la caja, por eso se suman al efectivo esperado.
 */
export function summarizeShift(orders: { paymentMethod?: string; total: number; tip?: number }[], initialCash: number) {
  const sales = sumByPaymentBucket(orders);
  const tips = { cash: 0, card: 0, transfer: 0, total: 0 };
  for (const o of orders) {
    const t = Number(o.tip) || 0;
    if (!t) continue;
    tips[classifyPaymentMethod(o.paymentMethod)] += t;
    tips.total += t;
  }
  return { sales, tips, expectedCash: initialCash + sales.cash + tips.cash };
}
