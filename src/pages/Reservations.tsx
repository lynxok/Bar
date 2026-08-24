import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Phone,
  User,
  MessageSquare,
  ChevronRight,
  Filter,
  MoreVertical
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Reservations() {
  const { reservations, tables, addReservation, updateReservation, deleteReservation } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    tableId: '',
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    comensales: 2,
    notes: ''
  });

  const filteredReservations = reservations
    .filter(res => {
      const matchesSearch = res.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.customerPhone?.includes(searchQuery);
      const matchesStatus = filterStatus === 'all' || res.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addReservation({
      ...formData,
      status: 'pending'
    });
    setIsAddModalOpen(false);
    setFormData({
      customerName: '',
      customerPhone: '',
      tableId: '',
      date: new Date().toISOString().split('T')[0],
      time: '20:00',
      comensales: 2,
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'seated': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'cancelled': return 'Cancelada';
      case 'seated': return 'En Mesa';
      default: return 'Pendiente';
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Reservas</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gestión de mesas y agenda de clientes.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Nueva Reserva
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-12 flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none transition-all text-sm font-bold dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {['all', 'pending', 'confirmed', 'seated', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-4 h-11 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                  filterStatus === status
                    ? "bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-100 dark:shadow-none"
                    : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {status === 'all' ? 'Todas' : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredReservations.map((res) => (
              <motion.div
                layout
                key={res.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      getStatusColor(res.status)
                    )}>
                      {getStatusLabel(res.status)}
                    </div>
                    <div className="flex gap-1">
                      {res.status === 'pending' && (
                        <button
                          onClick={() => updateReservation(res.id!, { status: 'confirmed' })}
                          className="w-8 h-8 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteReservation(res.id!)}
                        className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter line-clamp-1">{res.customerName}</h3>
                    <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mt-1">
                      <Phone className="w-3.5 h-3.5" /> {res.customerPhone || 'Sin teléfono'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        <Calendar className="w-3 h-3" /> Fecha
                      </div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-200">{new Date(res.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        <Clock className="w-3 h-3" /> Hora
                      </div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-200">{res.time}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                        {res.tableId ? res.tableId.replace('T-', '') : '?'}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa</p>
                        <p className="text-xs font-black text-slate-800 dark:text-white">{res.tableId || 'Sin asignar'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-black text-slate-800 dark:text-white">{res.comensales}</span>
                    </div>
                  </div>

                  {res.notes && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                      <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-400 line-clamp-2">{res.notes}</p>
                    </div>
                  )}

                  <button 
                    onClick={() => updateReservation(res.id!, { status: 'seated' })}
                    disabled={res.status === 'seated' || res.status === 'cancelled'}
                    className="w-full h-12 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Sentar Comensales <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredReservations.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
              <Calendar className="w-20 h-20 mb-4 opacity-20" />
              <p className="text-sm font-black uppercase tracking-widest opacity-40 text-center">No hay reservas que coincidan con los filtros</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-[500] flex items-center justify-center p-6" onClick={() => setIsAddModalOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight">Nueva Reserva</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Completa los datos del cliente</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-3 text-slate-400 hover:bg-rose-50 rounded-full transition-colors">
                <XCircle className="w-7 h-7" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      required
                      type="text"
                      value={formData.customerName}
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all"
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all"
                      placeholder="Ej: +54 11..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comensales</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.comensales}
                      onChange={e => setFormData({ ...formData, comensales: parseInt(e.target.value) })}
                      className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mesa (Opcional)</label>
                  <select
                    value={formData.tableId}
                    onChange={e => setFormData({ ...formData, tableId: e.target.value })}
                    className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="">Seleccionar mesa...</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.label || t.id} (Cap: {t.capacity})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all resize-none"
                    placeholder="Preferencias, alergias, etc."
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98] mt-4"
              >
                Confirmar Reserva
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
