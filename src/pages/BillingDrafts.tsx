import React, { useState } from "react";
import { useStore } from "../contexts/StoreContext";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Search, 
  Calendar, 
  User, 
  CreditCard,
  Check,
  AlertCircle,
  Eye,
  MapPin,
  Printer,
  X
} from "lucide-react";
import { cn } from "../lib/utils";
import { BillingDraft } from "../db/database";

export function BillingDrafts() {
  const { billingDrafts, markDraftsAsBilled } = useStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'billed'>('pending');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal states
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isConsumidorFinal, setIsConsumidorFinal] = useState(true);
  const [billingDate, setBillingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [identificador, setIdentificador] = useState("");
  const [direccion, setDireccion] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Invoice Preview Modal
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<BillingDraft | null>(null);

  // Filters
  const filteredDrafts = billingDrafts.filter(draft => {
    const matchesSearch = draft.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          draft.concept.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'pending') {
      return !draft.billed && matchesSearch;
    } else {
      return draft.billed && matchesSearch;
    }
  });

  // Calculate totals
  const totalPendingAmount = billingDrafts
    .filter(d => !d.billed)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalBilledAmount = billingDrafts
    .filter(d => d.billed)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingCount = billingDrafts.filter(d => !d.billed).length;
  const billedCount = billingDrafts.filter(d => d.billed).length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredDrafts.map(d => d.id || ""));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleOpenBilling = () => {
    if (selectedIds.length === 0) return;
    setIdentificador("");
    setDireccion("");
    setRazonSocial("");
    setIsConsumidorFinal(true);
    setBillingDate(new Date().toISOString().split('T')[0]);
    setIsBillingModalOpen(true);
  };

  const handleProcessBilling = async () => {
    if (!isConsumidorFinal && (!identificador.trim() || !direccion.trim() || !razonSocial.trim())) {
      alert("Por favor, ingresá el CUIT/DNI, Razón Social y la Dirección para la facturación nominada.");
      return;
    }
    if (!billingDate) {
      alert("Por favor, seleccioná una fecha de facturación válida.");
      return;
    }

    setIsProcessing(true);

    try {
      const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
      const savedSettingsRaw = localStorage.getItem('bar_arca_settings');
      const arcaSettings = savedSettingsRaw ? JSON.parse(savedSettingsRaw) : null;

      // If in Electron and has valid settings, send to AFIP
      if (isElectron && arcaSettings && arcaSettings.cuit) {
        const ipc = (window as any).require('electron').ipcRenderer;
        
        // Sum total amount
        const totalAmount = selectedIds.reduce((sum, id) => {
          const draft = billingDrafts.find(d => d.id === id);
          return sum + (draft ? draft.amount : 0);
        }, 0);

        const conceptsJoined = selectedIds.map(id => {
          const draft = billingDrafts.find(d => d.id === id);
          return draft ? `${draft.clientName}: ${draft.concept}` : '';
        }).filter(Boolean).join('; ');

        const clientData = {
          isConsumidorFinal,
          cuit: isConsumidorFinal ? '0' : identificador.trim(),
          razonSocial: isConsumidorFinal ? 'Consumidor Final' : razonSocial.trim(),
          domicilio: isConsumidorFinal ? 'Consumidor Final' : direccion.trim()
        };

        const res = await ipc.invoke('arca-generate-invoice', {
          settings: {
            arcaInfo: arcaSettings,
            invoicePath: arcaSettings.invoicePath
          },
          client: clientData,
          amount: totalAmount,
          concept: conceptsJoined
        });

        if (res.success) {
          // Success emitting invoice
          await markDraftsAsBilled(selectedIds, {
            isConsumidorFinal,
            identificador: isConsumidorFinal ? undefined : identificador.trim(),
            direccion: isConsumidorFinal ? undefined : direccion.trim(),
            billingDate,
            invoiceNumber: res.invoiceNumber,
            cae: res.cae,
            caeVto: res.caeVto,
            filePath: res.filePath
          });
          alert(`¡Factura Nro ${res.invoiceNumber} generada y autorizada por AFIP/ARCA!`);
        } else {
          throw new Error(res.error || 'Error desconocido al facturar con AFIP');
        }
      } else {
        // Fallback / Simulation Mode
        const simulatedInvoiceNumber = Math.floor(Math.random() * 90000) + 10000;
        const simulatedCae = Math.floor(Math.random() * 90000000000000) + 10000000000000;

        await markDraftsAsBilled(selectedIds, {
          isConsumidorFinal,
          identificador: isConsumidorFinal ? undefined : identificador.trim(),
          direccion: isConsumidorFinal ? undefined : direccion.trim(),
          billingDate,
          invoiceNumber: simulatedInvoiceNumber,
          cae: simulatedCae.toString(),
          caeVto: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          filePath: undefined
        });
        
        if (isElectron) {
          alert("Aviso: Configura los datos de ARCA/AFIP en Configuración para emitir facturas reales. Se generó un CAE de simulación offline.");
        } else {
          alert("¡Borradores facturados correctamente (Simulación Web Offline)!");
        }
      }

      setIsBillingModalOpen(false);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      alert(`Error al facturar comprobantes: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPreview = (draft: BillingDraft) => {
    setPreviewDraft(draft);
    setIsInvoicePreviewOpen(true);
  };

  const handleOpenPDF = async (filePath: string) => {
    const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
    if (isElectron) {
      const ipc = (window as any).require('electron').ipcRenderer;
      await ipc.invoke('open-file-path', filePath);
    } else {
      alert("La apertura de archivos locales solo está disponible en la versión de escritorio.");
    }
  };

  const handleRegeneratePDF = async (draft: BillingDraft) => {
    try {
      const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
      const savedSettingsRaw = localStorage.getItem('bar_arca_settings');
      const arcaSettings = savedSettingsRaw ? JSON.parse(savedSettingsRaw) : null;

      if (isElectron && arcaSettings) {
        const ipc = (window as any).require('electron').ipcRenderer;
        const res = await ipc.invoke('arca-regenerate-pdf', {
          draft,
          settings: {
            arcaInfo: arcaSettings,
            invoicePath: arcaSettings.invoicePath
          }
        });
        if (res.success) {
          alert("¡PDF regenerado correctamente!");
          if (draft.billingData) {
            draft.billingData.filePath = res.filePath;
          }
        } else {
          alert("Error: " + res.error);
        }
      } else {
        alert("Función disponible únicamente en el software de escritorio con configuración activa.");
      }
    } catch (e: any) {
      alert("Error regenerando PDF: " + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-300 text-slate-800 dark:text-slate-100">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-950/20 dark:to-orange-950/20 p-5 rounded-2xl border border-amber-200/50 dark:border-amber-900/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Pendiente de Facturar</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">${totalPendingAmount.toLocaleString('es-AR')}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 block mt-0.5 font-medium">{pendingCount} transacciones en borrador</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/20 dark:to-teal-950/20 p-5 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500 text-white rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Facturado Consolidado</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">${totalBilledAmount.toLocaleString('es-AR')}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">{billedCount} facturas emitidas</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-950/20 dark:to-indigo-950/20 p-5 rounded-2xl border border-blue-200/50 dark:border-blue-900/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500 text-white rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Registros</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{billingDrafts.length}</span>
            <span className="text-xs text-blue-600 dark:text-blue-400 block mt-0.5 font-medium">Borradores + Facturas totales</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Header Options */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => { setActiveTab('pending'); setSelectedIds([]); }}
              className={cn(
                "flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                activeTab === 'pending'
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm animate-fade-in"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              )}
            >
              <Clock className="w-4 h-4" /> Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => { setActiveTab('billed'); setSelectedIds([]); }}
              className={cn(
                "flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                activeTab === 'billed'
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm animate-fade-in"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              )}
            >
              <CheckCircle2 className="w-4 h-4" /> Facturadas ({billedCount})
            </button>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, medio pago..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-4 w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-600 outline-none transition-all"
              />
            </div>

            {activeTab === 'pending' && (
              <button
                disabled={selectedIds.length === 0}
                onClick={handleOpenBilling}
                className={cn(
                  "h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all",
                  selectedIds.length > 0
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200/50 dark:border-slate-800"
                )}
              >
                <FileText className="w-4 h-4" /> Facturar Selección ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800 font-bold">
              <tr>
                {activeTab === 'pending' && (
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={filteredDrafts.length > 0 && selectedIds.length === filteredDrafts.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Detalle / Concepto</th>
                <th className="px-6 py-4">Medio de Cobro</th>
                {activeTab === 'billed' && <th className="px-6 py-4">Datos Fiscales</th>}
                <th className="px-6 py-4 text-right">Importe</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredDrafts.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'pending' ? 8 : 7} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron registros en esta sección.
                  </td>
                </tr>
              ) : filteredDrafts.map(draft => (
                <tr 
                  key={draft.id} 
                  className={cn(
                    "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors",
                    selectedIds.includes(draft.id || "") && "bg-emerald-500/5 dark:bg-emerald-950/10"
                  )}
                >
                  {activeTab === 'pending' && (
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(draft.id || "")}
                        onChange={() => handleSelectOne(draft.id || "")}
                        className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {new Date(draft.date).toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                    {draft.clientName}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate">
                    {draft.concept}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-bold uppercase tracking-wider text-[10px]">
                      {draft.paymentMethod}
                    </span>
                  </td>
                  {activeTab === 'billed' && (
                    <td className="px-6 py-4 text-xs">
                      {draft.billingData && (
                        <div className="space-y-0.5 text-slate-600 dark:text-slate-400 font-sans">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">
                            {draft.billingData.isConsumidorFinal ? "Consumidor Final" : "Factura Nominada"}
                          </p>
                          <p className="text-[10px] font-mono">
                            Nro: {draft.billingData.invoiceNumber ? draft.billingData.invoiceNumber.toString().padStart(8, '0') : 'S/N'}
                          </p>
                          {draft.billingData.identificador && (
                            <p className="text-[10px] font-mono">
                              Doc: {draft.billingData.identificador}
                            </p>
                          )}
                          <p className="text-[9px] text-slate-450">
                            CAE: {draft.billingData.cae || 'Simulado'}
                          </p>
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                    ${draft.amount.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleOpenPreview(draft)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all cursor-pointer"
                        title="Ver detalle del Borrador"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {activeTab === 'billed' && draft.billingData?.filePath && (
                        <button
                          onClick={() => handleOpenPDF(draft.billingData?.filePath || '')}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all cursor-pointer"
                          title="Abrir PDF en la PC"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      {activeTab === 'billed' && !draft.billingData?.filePath && (
                        <button
                          onClick={() => handleRegeneratePDF(draft)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-955/30 rounded-lg transition-all cursor-pointer"
                          title="Regenerar Archivo PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BILLING MODAL */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" /> Facturar Lote
              </h3>
              <button 
                onClick={() => setIsBillingModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block mb-2">Tipo de Cliente</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                  <button
                    onClick={() => setIsConsumidorFinal(true)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold transition-all",
                      isConsumidorFinal 
                        ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    Consumidor Final
                  </button>
                  <button
                    onClick={() => setIsConsumidorFinal(false)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold transition-all",
                      !isConsumidorFinal 
                        ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    Nominada (Individuo)
                  </button>
                </div>
              </div>

              {!isConsumidorFinal && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-205">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">DNI / CUIT</label>
                    <input
                      type="text"
                      value={identificador}
                      onChange={e => setIdentificador(e.target.value)}
                      placeholder="Ej: 20-38472938-9"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Nombre o Razón Social</label>
                    <input
                      type="text"
                      value={razonSocial}
                      onChange={e => setRazonSocial(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Dirección Comercial</label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={e => setDireccion(e.target.value)}
                      placeholder="Ej: Av. Rivadavia 4567, CABA"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Fecha de Comprobante</label>
                <input
                  type="date"
                  value={billingDate}
                  onChange={e => setBillingDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex gap-2">
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="flex-1 h-11 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessBilling}
                disabled={isProcessing}
                className="flex-1 h-11 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? "Procesando..." : "Emitir Factura"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAFT PREVIEW MODAL */}
      {isInvoicePreviewOpen && previewDraft && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Detalle del Comprobante
              </h3>
              <button 
                onClick={() => setIsInvoicePreviewOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20 font-mono text-xs">
              <div className="flex justify-between text-slate-500">
                <span>ESTADO:</span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded text-[10px] uppercase",
                  previewDraft.billed 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" 
                    : "bg-amber-100 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400"
                )}>
                  {previewDraft.billed ? "FACTURADO" : "PENDIENTE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IDENTIFICADOR BORRADOR:</span>
                <span className="text-slate-900 dark:text-white">{previewDraft.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">FECHA REGISTRO:</span>
                <span className="text-slate-900 dark:text-white">{new Date(previewDraft.date).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CLIENTE COMERCIAL:</span>
                <span className="text-slate-900 dark:text-white font-bold">{previewDraft.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MEDIO DE COBRO:</span>
                <span className="text-slate-900 dark:text-white uppercase">{previewDraft.paymentMethod}</span>
              </div>
              
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <span className="text-slate-500 block mb-1">CONCEPTOS REGISTRADOS:</span>
                <p className="text-slate-800 dark:text-slate-200 font-sans whitespace-pre-wrap">{previewDraft.concept}</p>
              </div>

              {previewDraft.billed && previewDraft.billingData && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                  <span className="text-slate-500 block font-bold text-[10px] text-emerald-600 dark:text-emerald-450">INFORMACIÓN FISCAL ASOCIADA (AFIP):</span>
                  <div className="flex justify-between">
                    <span>NRO COMPROBANTE:</span>
                    <span className="font-bold">{previewDraft.billingData.invoiceNumber?.toString().padStart(8, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CAE FISCAL:</span>
                    <span>{previewDraft.billingData.cae || 'Simulado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VTO CAE:</span>
                    <span>{previewDraft.billingData.caeVto || 'N/A'}</span>
                  </div>
                  {previewDraft.billingData.identificador && (
                    <div className="flex justify-between">
                      <span>DOC CLIENTE:</span>
                      <span>{previewDraft.billingData.identificador}</span>
                    </div>
                  )}
                  {previewDraft.billingData.direccion && (
                    <div className="flex justify-between">
                      <span>DIRECCIÓN FISCAL:</span>
                      <span className="truncate max-w-[200px]" title={previewDraft.billingData.direccion}>
                        {previewDraft.billingData.direccion}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between text-base font-black text-slate-900 dark:text-white font-sans">
                <span>TOTAL COMERCIAL:</span>
                <span>${previewDraft.amount.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsInvoicePreviewOpen(false)}
                className="flex-1 h-11 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Cerrar Detalle
              </button>
              {previewDraft.billed && previewDraft.billingData?.filePath && (
                <button
                  onClick={() => handleOpenPDF(previewDraft.billingData?.filePath || '')}
                  className="flex-1 h-11 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> Abrir PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
