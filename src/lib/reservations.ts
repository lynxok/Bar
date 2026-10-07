import type { Reservation } from '../db/database';

export const ACTIVE_STATUSES = ['pending', 'confirmed'] as const;
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', seated: 'Sentados', cancelled: 'Cancelada', no_show: 'No vino',
};

const start = (r: Reservation) => new Date(r.date).getTime();
const end = (r: Reservation) => start(r) + (r.durationMin || 120) * 60_000;
const isActive = (r: Reservation) => (ACTIVE_STATUSES as readonly string[]).includes(r.status);

/** Reservas activas que se superponen en la misma mesa (excluye la propia). */
export function findConflicts(candidate: Reservation, all: Reservation[]): Reservation[] {
  if (!candidate.tableId) return [];
  return all.filter(r =>
    r.id !== candidate.id && isActive(r) && r.tableId === candidate.tableId &&
    start(r) < end(candidate) && start(candidate) < end(r)
  );
}

/** Próxima reserva activa de una mesa que empieza dentro de `windowMin` minutos (o ya empezó y no se sentó). */
export function upcomingForTable(tableId: string, all: Reservation[], now = Date.now(), windowMin = 120): Reservation | undefined {
  return all
    .filter(r => isActive(r) && r.tableId === tableId && start(r) <= now + windowMin * 60_000 && end(r) > now)
    .sort((a, b) => start(a) - start(b))[0];
}

export const sameDay = (iso: string, day: Date) => {
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
};

export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
