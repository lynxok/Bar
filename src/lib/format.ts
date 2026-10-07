/**
 * Formateo estándar de dinero en pesos argentinos para LYNX BarOS.
 * Voz y contexto: es-AR ($26.000, $4.512,40).
 * Números enteros no muestran decimales innecesarios (,00), números con centavos muestran exactamente 2 decimales.
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '$0';
  }

  const isInteger = Math.abs(amount % 1) < 0.001;
  const formatted = amount.toLocaleString('es-AR', {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `$${formatted}`;
}
