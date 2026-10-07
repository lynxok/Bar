import { describe, it, expect } from 'vitest';
import { formatMoney } from '../../src/lib/format';

describe('formatMoney', () => {
  it('formatea números enteros sin decimales superfluos con punto de miles es-AR', () => {
    expect(formatMoney(26000)).toBe('$26.000');
    expect(formatMoney(0)).toBe('$0');
    expect(formatMoney(1500)).toBe('$1.500');
    expect(formatMoney(1000000)).toBe('$1.000.000');
  });

  it('formatea números con centavos usando coma decimal es-AR', () => {
    expect(formatMoney(4512.4)).toBe('$4.512,40');
    expect(formatMoney(4512.45)).toBe('$4.512,45');
    expect(formatMoney(0.5)).toBe('$0,50');
  });

  it('maneja valores nulos o indefinidos', () => {
    expect(formatMoney(null)).toBe('$0');
    expect(formatMoney(undefined)).toBe('$0');
    expect(formatMoney(NaN)).toBe('$0');
  });
});
