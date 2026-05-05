import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { 
  ShieldAlert, 
  History, 
  Search, 
  Filter, 
  Trash2, 
  AlertCircle, 
  Info, 
  Terminal,
  User,
  Clock,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Security() {
  const [activeTab, setActiveTab] = useState<'audit' | 'logs'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Query Audit Logs
  const auditLogs = useLiveQuery(async () => {
    let collection = db.auditLogs.orderBy('timestamp').reverse();
    const logs = await collection.toArray();
    if (!searchTerm) return logs;
    return logs.filter(log => 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Query System Logs
  const systemLogs = useLiveQuery(async () => {
    let collection = db.systemLogs.orderBy('timestamp').reverse();
    const logs = await collection.toArray();
    let filtered = logs;
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.context && log.context.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return filtered;
  }, [searchTerm, levelFilter]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const clearLogs = async () => {
    if (confirm('¿Estás seguro de que deseas vaciar todos los registros? Esta acción no se puede deshacer.')) {
      if (activeTab === 'audit') await db.auditLogs.clear();
      else await db.systemLogs.clear();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            Seguridad y Auditoría
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Monitoreo de actividad y registros críticos del sistema.</p>
        </div>
        
        <button 
          onClick={clearLogs}
          className="flex items-center gap-2 px-4 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold text-xs transition-all active:scale-95 border border-rose-100"
        >
          <Trash2 className="w-4 h-4" />
          Vaciar Registros
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => { setActiveTab('audit'); setSearchTerm(''); }}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'audit' 
              ? "bg-white text-indigo-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          )}
        >
          <History className="w-4 h-4" />
          Auditoría de Cambios
        </button>
        <button
          onClick={() => { setActiveTab('logs'); setSearchTerm(''); }}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'logs' 
              ? "bg-white text-indigo-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          )}
        >
          <Terminal className="w-4 h-4" />
          Logs del Sistema
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder={activeTab === 'audit' ? "Buscar por usuario, acción o módulo..." : "Buscar en mensajes o contexto..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
          />
        </div>
        
        {activeTab === 'logs' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            <select 
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">Todos los Niveles</option>
              <option value="error">Solo Errores</option>
              <option value="warning">Advertencias</option>
              <option value="info">Información</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'audit' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {auditLogs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                        log.action === 'CREATE' ? "bg-emerald-100 text-emerald-700" :
                        log.action === 'UPDATE' ? "bg-amber-100 text-amber-700" :
                        log.action === 'DELETE' ? "bg-rose-100 text-rose-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.module}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 font-medium">{log.details}</p>
                    </td>
                  </tr>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium">
                      No se encontraron registros de auditoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Fecha / Nivel</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensaje</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Contexto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {systemLogs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400">{formatDate(log.timestamp)}</span>
                        <div className="flex items-center gap-1.5">
                          {log.level === 'error' && <AlertCircle className="w-3 h-3 text-rose-500" />}
                          {log.level === 'warning' && <AlertCircle className="w-3 h-3 text-amber-500" />}
                          {log.level === 'info' && <Info className="w-3 h-3 text-blue-500" />}
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            log.level === 'error' ? "text-rose-600" :
                            log.level === 'warning' ? "text-amber-600" :
                            "text-blue-600"
                          )}>
                            {log.level}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className={cn(
                        "text-sm font-bold",
                        log.level === 'error' ? "text-rose-700" : "text-slate-700"
                      )}>
                        {log.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.context && (
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          <code className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded">
                            {log.context}
                          </code>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {(!systemLogs || systemLogs.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center text-slate-400 font-medium">
                      El registro de errores está vacío.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
