import { useState, useEffect } from "react";
import { db } from "../db/database";
import { LoggerService } from "../lib/LoggerService";
import { Terminal, Trash2, AlertCircle, RefreshCw, Eye, ShieldAlert, CheckCircle, Database } from "lucide-react";
import { cn } from "../lib/utils";

export function Logs() {
  const [activeTab, setActiveTab] = useState<'system' | 'audit'>('system');
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const sys = await db.systemLogs.orderBy('timestamp').reverse().toArray();
      const aud = await db.auditLogs.orderBy('timestamp').reverse().toArray();
      setSystemLogs(sys);
      setAuditLogs(aud);
    } catch (e) {
      console.error("Error fetching logs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = async () => {
    if (!confirm("¿Está seguro de que desea limpiar todos los registros?")) return;
    try {
      await db.systemLogs.clear();
      await db.auditLogs.clear();
      await fetchLogs();
    } catch (e) {
      alert("Error al limpiar los logs");
    }
  };

  const handleAddTestError = async () => {
    await LoggerService.error("Error de prueba generado manualmente por Superadmin Dev", "Logs.tsx:38");
    await fetchLogs();
  };

  return (
    <div className="p-6 space-y-6 bg-surface-container-low text-on-surface min-h-[calc(100vh-64px)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant pb-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-rose-500/10 p-2.5 rounded-xl text-rose-600">
              <Terminal size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-on-surface tracking-tight uppercase">REGISTRO TÉCNICO (LOGS DEL SISTEMA)</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Panel exclusivo de diagnóstico para el rol <span className="font-bold text-rose-600">Superadmin Dev</span>.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddTestError}
            className="h-11 px-4 bg-surface-container-high border border-outline-variant hover:bg-surface-container rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 text-on-surface"
          >
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            Generar Error Test
          </button>
          <button
            onClick={handleClearLogs}
            className="h-11 px-4 bg-rose-600 text-white rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-wider shadow-md hover:bg-rose-700 transition-all active:scale-95 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar Logs
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-surface-container p-1 rounded-xl shadow-sm border border-outline-variant w-fit">
        <button
          className={cn(
            "px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer",
            activeTab === 'system' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-low"
          )}
          onClick={() => setActiveTab('system')}
        >
          <AlertCircle className="h-4 w-4" /> Logs de Sistema ({systemLogs.length})
        </button>
        <button
          className={cn(
            "px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer",
            activeTab === 'audit' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-low"
          )}
          onClick={() => setActiveTab('audit')}
        >
          <Database className="h-4 w-4" /> Auditoría de Acciones ({auditLogs.length})
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
            Mostrando registros en orden cronológico inverso (Más recientes primero)
          </span>
          <button
            onClick={fetchLogs}
            className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>

        {activeTab === 'system' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low font-bold">
                  <th className="p-4 uppercase tracking-wider text-on-surface-variant w-[20%]">Timestamp</th>
                  <th className="p-4 uppercase tracking-wider text-on-surface-variant w-[10%]">Nivel</th>
                  <th className="p-4 uppercase tracking-wider text-on-surface-variant w-[50%]">Mensaje</th>
                  <th className="p-4 uppercase tracking-wider text-on-surface-variant w-[20%]">Contexto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {systemLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-on-surface-variant italic font-sans">
                      No hay registros de errores en el sistema. ¡Todo funciona perfectamente!
                    </td>
                  </tr>
                ) : (
                  systemLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      className={cn(
                        "hover:bg-surface-container-high transition-colors",
                        log.level === 'error' ? "bg-rose-500/5 text-rose-950" : "bg-amber-500/5 text-amber-950"
                      )}
                    >
                      <td className="p-4 font-bold">{new Date(log.timestamp).toLocaleString('es-AR')}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                          log.level === 'error' ? "bg-rose-600 text-white" : "bg-amber-500 text-slate-900"
                        )}>
                          {log.level}
                        </span>
                      </td>
                      <td className="p-4 whitespace-pre-wrap break-all font-sans font-medium">{log.message}</td>
                      <td className="p-4 font-semibold text-[10px] text-on-surface-variant">{log.context || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low font-bold">
                  <th className="p-4 uppercase tracking-wider text-on-surface-variant w-[20%]">Timestamp</th>
                  <th className="p-4 uppercase tracking-wider text-on-surface-variant w-[15%]">Usuario</th>
                  <th className="p-4 uppercase tracking-wider text-on-surface-variant w-[15%]">Acción / Módulo</th>
                  <th className="p-4 uppercase tracking-wider text-on-surface-variant w-[50%]">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-on-surface-variant italic font-sans">
                      No hay registros de auditoría aún.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-high transition-colors text-on-surface">
                      <td className="p-4 font-bold">{new Date(log.timestamp).toLocaleString('es-AR')}</td>
                      <td className="p-4 font-bold font-sans">
                        {log.userName} <span className="text-[10px] text-on-surface-variant block font-mono">({log.userId})</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-wider block w-fit mb-1">
                          {log.action}
                        </span>
                        <span className="text-[10px] font-semibold text-on-surface-variant">
                          {log.module}
                        </span>
                      </td>
                      <td className="p-4 font-sans font-medium text-on-surface">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
