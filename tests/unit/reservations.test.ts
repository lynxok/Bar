import { describe, expect, it } from 'vitest';
import { findConflicts, upcomingForTable } from '../../src/lib/reservations';

const r = (id: number, time: string, over: any = {}) => ({ id, customerName: 'X', partySize: 2, date: `2026-10-07T${time}:00`, durationMin: 120, tableId: 'T-1', status: 'confirmed', ...over });

describe('reservas', () => {
  it('detecta superposición en la misma mesa', () => {
    const all = [r(1, '20:00'), r(2, '23:00'), r(3, '20:30', { tableId: 'T-2' }), r(4, '21:00', { status: 'cancelled' })];
    expect(findConflicts(r(9, '21:00') as any, all as any).map(x => x.id)).toEqual([1]);
    expect(findConflicts(r(9, '22:00') as any, all as any).map(x => x.id)).toEqual([2]);
    expect(findConflicts(r(9, '18:00') as any, all as any)).toEqual([]);
    expect(findConflicts(r(1, '20:00') as any, all as any)).toEqual([]);
  });
  it('marca la mesa si la reserva empieza dentro de 2 horas', () => {
    const now = new Date('2026-10-07T19:00:00').getTime();
    const all = [r(1, '20:30'), r(2, '22:00', { tableId: 'T-1' })];
    expect(upcomingForTable('T-1', all as any, now)?.id).toBe(1);
    expect(upcomingForTable('T-2', all as any, now)).toBeUndefined();
    expect(upcomingForTable('T-1', [r(5, '23:30')] as any, now)).toBeUndefined();
  });
});
