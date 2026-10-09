import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Phone, Plus, UserX, Users, X } from 'lucide-react';
import { db, type Reservation } from '../db/database';
import { useStore } from '../contexts/StoreContext';
import { findConflicts, sameDay, STATUS_LABEL, timeLabel } from '../lib/reservations';
import { getStoredUser } from '../lib/auth';
import { cn } from '../lib/utils';

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-[#0F6B41] border-emerald-200 dark:text-emerald-400',
  seated: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200 line-through dark:bg-white/5 dark:text-zinc-400 dark:border-white/10',
  no_show: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface FormState { id?: number; customerName: string; phone: string; partySize: number; day: string; time: string; durationMin: number; tableId: string; notes: string; status: Reservation['status']; }

export default function Reservations() {
  const { tables, updateTable } = useStore();
  const [day, setDay] = useState(() => new Date());
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');
  const all = useLiveQuery(() => db.reservations.toArray(), []) || [];

  const dayList = useMemo(() => all
    .filter(r => sameDay(r.date, day))
    .sort((a, b) => a.date.localeCompare(b.date)), [all, day]);

  const covers = dayList.filter(r => r.status === 'pending' || r.status === 'confirmed' || r.status === 'seated')
    .reduce((a, r) => a + (r.partySize || 0), 0);

  const realTables = tables.filter(t => !['wall', 'bar'].includes(t.type));

  const openNew = () => setForm({
    customerName: '', phone: '', partySize: 2, day: toLocalInput(day), time: '21:00',
    durationMin: 120, tableId: '', notes: '', status: 'confirmed',
  });

  const openEdit = (r: Reservation) => {
    const d = new Date(r.date);
    setForm({
      id: r.id, customerName: r.customerName, phone: r.phone || '', partySize: r.partySize,
      day: toLocalInput(d), time: d.toTimeString().slice(0, 5), durationMin: r.durationMin || 120,
      tableId: r.tableId || '', notes: r.notes || '', status: r.status,
    });
  };

  const formAsReservation = (f: FormState): Reservation => ({
    id: f.id, customerName: f.customerName.trim(), phone: f.phone.trim() || undefined,
    partySize: Math.max(1, Number(f.partySize) || 1), date: new Date(`${f.day}T${f.time}:00`).toISOString(),
    durationMin: Math.max(15, Number(f.durationMin) || 120), tableId: f.tableId || undefined,
    notes: f.notes.trim() || undefined, status: f.status,
  });

  const conflicts = form ? findConflicts(formAsReservation(form), all) : [];

  const save = async () => {
    if (!form) return;
    setError('');
    if (!form.customerName.trim()) { setError('Ingresá el nombre del cliente.'); return; }
    if (!form.day || !form.time) { setError('Elegí fecha y hora.'); return; }
    const r = formAsReservation(form);
    if (r.id) {
      const { id, ...changes } = r;
      await db.reservations.update(id!, changes);
    } else {
      await db.reservations.add({ ...r, createdBy: getStoredUser()?.name });
    }
    setForm(null);
  };

  const setStatus = async (r: Reservation, status: Reservation['status']) => {
    await db.reservations.update(r.id!, { status });
    if (status === 'seated' && r.tableId) {
      const t = tables.find(x => x.id === r.tableId);
      if (t && t.status === 'available') await updateTable(r.tableId, { status: 'occupied_no_order' });
    }
  };

  const shiftDay = (n: number) => setDay(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 dark:text-zinc-100"><CalendarDays className="w-6 h-6 text-[#0F6B41] dark:text-emerald-400" /> Reservas</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">{dayList.length} reserva(s) · {covers} cubierto(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDay(-1)} className="p-2 rounded-xl bg-white border border-slate-200 dark:bg-[var(--bg-surface)] dark:border-white/10 dark:text-zinc-100"><ChevronLeft className="w-4 h-4" /></button>
          <input type="date" value={toLocalInput(day)} onChange={e => e.target.value && setDay(new Date(`${e.target.value}T00:00:00`))}
            className="h-10 px-3 rounded-xl border border-slate-200 font-bold text-sm dark:border-white/10 dark:bg-[var(--bg-surface)] dark:text-zinc-100 dark:[color-scheme:dark]" />
          <button onClick={() => shiftDay(1)} className="p-2 rounded-xl bg-white border border-slate-200 dark:bg-[var(--bg-surface)] dark:border-white/10 dark:text-zinc-100"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setDay(new Date())} className="px-3 h-10 rounded-xl bg-slate-100 text-xs font-bold dark:bg-white/5 dark:text-zinc-100">Hoy</button>
          <button onClick={openNew} className="px-4 h-10 rounded-xl bg-[#0F6B41] hover:bg-[#0C5734] text-white text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Nueva</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 dark:bg-[var(--bg-surface)] dark:border-white/10 dark:divide-white/10">
        {dayList.length === 0 && <div className="p-10 text-center text-slate-400 font-bold dark:text-zinc-400">No hay reservas para este día.</div>}
        {dayList.map(r => {
          const clash = findConflicts(r, all).length > 0 && (r.status === 'pending' || r.status === 'confirmed');
          return (
            <div key={r.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div className="w-16 text-center">
                <div className="text-lg font-black text-slate-900 dark:text-zinc-100">{timeLabel(r.date)}</div>
                <div className="text-[10px] text-slate-400 font-bold dark:text-zinc-400">{r.durationMin} min</div>
              </div>
              <button onClick={() => openEdit(r)} className="flex-1 min-w-[180px] text-left">
                <div className="font-black text-slate-900 dark:text-zinc-100">{r.customerName}</div>
                <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap dark:text-zinc-400">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.partySize}</span>
                  {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>}
                  <span>{r.tableId ? `Mesa ${r.tableId.replace('T-', '')}` : 'Sin mesa asignada'}</span>
                  {r.notes && <span className="italic">“{r.notes}”</span>}
                </div>
                {clash && <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" /> Se superpone con otra reserva en la misma mesa</div>}
              </button>
              <span className={cn('px-2 py-1 rounded-lg border text-[10px] font-black uppercase', STATUS_STYLE[r.status])}>{STATUS_LABEL[r.status]}</span>
              <div className="flex gap-1">
                {r.status === 'pending' && <button onClick={() => setStatus(r, 'confirmed')} title="Confirmar" className="p-2 rounded-lg bg-emerald-50 text-[#0F6B41] dark:text-emerald-400"><Check className="w-4 h-4" /></button>}
                {(r.status === 'pending' || r.status === 'confirmed') && <>
                  <button onClick={() => setStatus(r, 'seated')} className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold">Sentar</button>
                  <button onClick={() => setStatus(r, 'no_show')} title="No vino" className="p-2 rounded-lg bg-rose-50 text-rose-600"><UserX className="w-4 h-4" /></button>
                  <button onClick={() => setStatus(r, 'cancelled')} title="Cancelar" className="p-2 rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400"><X className="w-4 h-4" /></button>
                </>}
              </div>
            </div>
          );
        })}
      </div>

      {form && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 dark:bg-[var(--bg-surface)]" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-xl text-slate-900 dark:text-zinc-100">{form.id ? 'Editar reserva' : 'Nueva reserva'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input className="col-span-2 h-11 px-3 rounded-xl bg-slate-50 font-bold outline-none dark:bg-[var(--color-paper-subtle)]" placeholder="Nombre del cliente"
                value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
              <input className="h-11 px-3 rounded-xl bg-slate-50 font-bold outline-none dark:bg-[var(--color-paper-subtle)]" placeholder="Teléfono"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-slate-50 font-bold text-sm dark:bg-[var(--color-paper-subtle)]">
                <Users className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                <input type="number" min={1} className="w-full bg-transparent outline-none" value={form.partySize}
                  onChange={e => setForm({ ...form, partySize: Number(e.target.value) })} /> pers.
              </label>
              <input type="date" className="h-11 px-3 rounded-xl bg-slate-50 font-bold outline-none dark:bg-[var(--color-paper-subtle)]" value={form.day}
                onChange={e => setForm({ ...form, day: e.target.value })} />
              <input type="time" className="h-11 px-3 rounded-xl bg-slate-50 font-bold outline-none dark:bg-[var(--color-paper-subtle)]" value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })} />
              <select className="h-11 px-3 rounded-xl bg-slate-50 font-bold outline-none dark:bg-[var(--color-paper-subtle)]" value={form.tableId}
                onChange={e => setForm({ ...form, tableId: e.target.value })}>
                <option value="">Sin mesa asignada</option>
                {realTables.map(t => <option key={t.id} value={t.id}>Mesa {t.id.replace('T-', '')} ({t.capacity} lug.)</option>)}
              </select>
              <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-slate-50 font-bold text-sm dark:bg-[var(--color-paper-subtle)]">
                <input type="number" min={15} step={15} className="w-full bg-transparent outline-none" value={form.durationMin}
                  onChange={e => setForm({ ...form, durationMin: Number(e.target.value) })} /> min
              </label>
              <textarea className="col-span-2 px-3 py-2 rounded-xl bg-slate-50 font-medium outline-none text-sm dark:bg-[var(--color-paper-subtle)]" rows={2} placeholder="Notas (cumpleaños, alergias, silla de bebé…)"
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            {form.tableId && (() => {
              const t = realTables.find(x => x.id === form.tableId);
              return t && form.partySize > t.capacity
                ? <div className="text-xs font-bold text-amber-700 bg-amber-50 p-2 rounded-xl">La mesa tiene {t.capacity} lugares para {form.partySize} personas.</div>
                : null;
            })()}
            {conflicts.length > 0 && (
              <div className="text-xs font-bold text-amber-700 bg-amber-50 p-2 rounded-xl">
                Se superpone con: {conflicts.map(c => `${c.customerName} (${timeLabel(c.date)})`).join(', ')}
              </div>
            )}
            {error && <div className="text-xs font-bold text-rose-700">{error}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="px-4 h-11 rounded-xl bg-slate-100 font-bold text-sm dark:bg-white/5">Cancelar</button>
              <button onClick={save} className="px-5 h-11 rounded-xl bg-[#0F6B41] hover:bg-[#0C5734] text-white font-bold text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
