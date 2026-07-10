import React, { useState, useRef, useEffect } from "react";
import { useBusiness } from "../contexts/BusinessContext";
import { useStore } from "../contexts/StoreContext";
import { cn } from "../lib/utils";
import { Store, Upload, Save, Image as ImageIcon, X, Users, Shield, Trash2, Key, Plus, CheckCircle, Circle, Edit2, Cloud, Database, RefreshCw, DownloadCloud, Wifi, Globe, Copy, Eye, EyeOff, QrCode, Network, Server, AlertCircle } from "lucide-react";
import { LoggerService } from "../lib/LoggerService";
import QRCode from "qrcode";
import InvoiceDesignSettings from "../components/InvoiceDesignSettings";

export function Settings() {
  const { businessName, setBusinessName, logo, setLogo, taxRate, setTaxRate } = useBusiness();
  const { users, addUser, updateUser, deleteUser } = useStore();
  const [tempName, setTempName] = useState(businessName);
  const [tempTax, setTempTax] = useState(taxRate);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newUser, setNewUser] = useState({ 
    name: '', 
    role: 'Mozo', 
    pin: '', 
    permissions: ['tables', 'pos'] as string[] 
  });
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
  const ipc = isElectron ? (window as any).require('electron').ipcRenderer : null;
  const CURRENT_VERSION = isElectron && ipc ? `v${ipc.sendSync('get-app-version')}` : "v1.1.0";

  // Estados de ngrok y sincronización
  const [ngrokToken, setNgrokToken] = useState(localStorage.getItem('ngrok_token') || '');
  const [tunnelPort, setTunnelPort] = useState(Number(localStorage.getItem('ngrok_port')) || 3001);
  const [tunnelStatus, setTunnelStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [syncMode, setSyncMode] = useState<'local' | 'supabase'>((localStorage.getItem('sync_mode') as 'local' | 'supabase') || 'local');
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(localStorage.getItem('supabase_anon_key') || '');
  const [isSavingSync, setIsSavingSync] = useState(false);

  // ARCA/AFIP Configuration & Diagnostic States
  const [arcaSettings, setArcaSettings] = useState(() => {
    const raw = localStorage.getItem('bar_arca_settings');
    return raw ? JSON.parse(raw) : {
      cuit: '',
      nombreEmisor: '',
      domicilioComercial: '',
      monotributoStartDate: '',
      puntoVenta: 2,
      certPath: '',
      keyPath: '',
      productionMode: false,
      invoicePath: ''
    };
  });
  const [testingArca, setTestingArca] = useState(false);
  const [arcaDiagnosticResult, setArcaDiagnosticResult] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Cargar estado de ngrok al iniciar
  useEffect(() => {
    if (ipc) {
      ipc.invoke('get-ngrok-status').then((status: any) => {
        if (status.active) {
          setTunnelStatus('active');
          setTunnelUrl(status.url);
        }
      });
      // Registrar config de Supabase inicial en el proceso principal
      ipc.send('set-supabase-config', {
        active: syncMode === 'supabase',
        url: supabaseUrl,
        anonKey: supabaseAnonKey
      });
    }
  }, [ipc]);

  // Generar QR para el túnel activo
  useEffect(() => {
    if (tunnelUrl) {
      QRCode.toDataURL(tunnelUrl, { width: 220, margin: 1 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error al generar QR:', err));
    } else {
      setQrCodeUrl('');
    }
  }, [tunnelUrl]);

  const handleToggleTunnel = async () => {
    if (!ipc) {
      alert("Esta función solo está disponible en la versión de escritorio de la aplicación.");
      return;
    }

    if (tunnelStatus === 'active') {
      setTunnelStatus('starting');
      const res = await ipc.invoke('stop-ngrok');
      if (res.success) {
        setTunnelStatus('idle');
        setTunnelUrl('');
      } else {
        setTunnelStatus('active');
        alert("Error al detener el túnel: " + res.error);
      }
    } else {
      if (!ngrokToken.trim()) {
        alert("Por favor, ingresa tu ngrok Authtoken.");
        return;
      }
      setTunnelStatus('starting');
      setErrorMsg('');
      
      localStorage.setItem('ngrok_token', ngrokToken);
      localStorage.setItem('ngrok_port', tunnelPort.toString());
      
      const res = await ipc.invoke('start-ngrok', { token: ngrokToken, port: tunnelPort });
      if (res.success) {
        setTunnelStatus('active');
        setTunnelUrl(res.url);
      } else {
        setTunnelStatus('error');
        setErrorMsg(res.error);
      }
    }
  };

  const handleSaveSyncConfig = async () => {
    setIsSavingSync(true);
    localStorage.setItem('sync_mode', syncMode);
    localStorage.setItem('supabase_url', supabaseUrl);
    localStorage.setItem('supabase_anon_key', supabaseAnonKey);

    if (ipc) {
      ipc.send('set-supabase-config', {
        active: syncMode === 'supabase',
        url: supabaseUrl,
        anonKey: supabaseAnonKey
      });
    }

    await new Promise(r => setTimeout(r, 1000));
    alert("Configuración de sincronización guardada correctamente.");
    setIsSavingSync(false);
  };

  useEffect(() => {
    if (!ipc) return;

    const onAvailable = (_: any, info: any) => {
      setLatestVersion(info.version);
      setUpdateStatus('available');
      setIsUpdating(false);
    };

    const onNotAvailable = () => {
      setUpdateStatus('idle');
      setIsUpdating(false);
      alert("No hay actualizaciones disponibles.");
    };

    const onProgress = (_: any, progressObj: any) => {
      setUpdateStatus('downloading');
      setDownloadProgress(Math.round(progressObj.percent));
    };

    const onDownloaded = () => {
      setUpdateStatus('downloaded');
    };

    const onError = (_: any, message: string) => {
      setIsUpdating(false);
      setUpdateStatus('idle');
      alert(`Error en la actualización: ${message}`);
    };

    ipc.on('update-available', onAvailable);
    ipc.on('update-not-available', onNotAvailable);
    ipc.on('download-progress', onProgress);
    ipc.on('update-downloaded', onDownloaded);
    ipc.on('update-error', onError);

    return () => {
      ipc.removeAllListeners('update-available');
      ipc.removeAllListeners('update-not-available');
      ipc.removeAllListeners('download-progress');
      ipc.removeAllListeners('update-downloaded');
      ipc.removeAllListeners('update-error');
    };
  }, [ipc]);

  const handleMigrateToCloud = async () => {
    setIsMigrating(true);
    // Simulate migration delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert("Migración a Supabase iniciada. El sistema cambiará a modo híbrido.");
    setIsMigrating(false);
  };

  const handleCheckUpdates = () => {
    if (!ipc) {
      alert("Esta función solo está disponible en la aplicación de escritorio.");
      return;
    }
    setIsUpdating(true);
    setUpdateStatus('checking');
    ipc.send('check-update');
  };

  const handleStartDownload = () => {
    if (ipc) ipc.send('start-download');
  };

  const handleApplyUpdate = () => {
    if (ipc) ipc.send('apply-update');
  };

  const MODULES = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tables', label: 'Mapa de Mesas' },
    { id: 'pos', label: 'Caja Rápida' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'loyalty', label: 'Fidelización' },
    { id: 'finance', label: 'Finanzas' },
    { id: 'settings', label: 'Configuración' },
  ];

  const handleSave = () => {
    setBusinessName(tempName);
    setTaxRate(tempTax);
  };

  const handleAddUser = async () => {
    if (newUser.name) {
      if (editingUserId) {
        await updateUser(editingUserId, newUser);
        await LoggerService.audit('UPDATE', 'USERS', `Usuario actualizado: ${newUser.name} (${newUser.role})`);
      } else {
        await addUser({ ...newUser, status: 'Active' });
        await LoggerService.audit('CREATE', 'USERS', `Nuevo usuario creado: ${newUser.name} (${newUser.role})`);
      }
      setNewUser({ name: '', role: 'Mozo', pin: '', permissions: ['tables', 'pos'] });
      setEditingUserId(null);
      setIsUserModalOpen(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    const user = users.find(u => u.id === id);
    if (user) {
      await deleteUser(id);
      await LoggerService.audit('DELETE', 'USERS', `Usuario eliminado: ${user.name}`);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setNewUser({ name: user.name, role: user.role, pin: user.pin || '', permissions: user.permissions || [] });
    setIsUserModalOpen(true);
  };

  const togglePermission = (moduleId: string) => {
    setNewUser(prev => ({
      ...prev,
      permissions: prev.permissions.includes(moduleId)
        ? prev.permissions.filter(p => p !== moduleId)
        : [...prev.permissions, moduleId]
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'updates' | 'network' | 'arca'>('general');

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Configuración del Negocio</h1>
        <p className="text-slate-500 mt-2">Personaliza la apariencia, gestiona usuarios y administra el sistema.</p>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === 'general'
              ? "border-indigo-600 text-indigo-650"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Información General
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === 'users'
              ? "border-indigo-600 text-indigo-650"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Usuarios y Permisos
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === 'updates'
              ? "border-indigo-600 text-indigo-650"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Actualizaciones y Base de Datos
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === 'network'
              ? "border-indigo-600 text-indigo-650"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Acceso Remoto y Red
        </button>
        <button
          onClick={() => setActiveTab('arca')}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === 'arca'
              ? "border-indigo-600 text-indigo-650"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Facturación (ARCA)
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <Store className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-lg text-slate-800">Información General</h2>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Logo Section */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-4">Logotipo del Negocio</label>
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                  {logo ? (
                    <>
                      <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center blur-0 backdrop-blur-sm">
                        <button 
                          onClick={handleRemoveLogo}
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                          title="Eliminar logo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-slate-500">
                    Sube el logotipo de tu restaurante o establecimiento. Este logo aparecerá en la barra lateral y en los recibos generados.
                  </p>
                  <div className="flex items-center gap-3">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/svg+xml" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors font-semibold text-sm shadow-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Seleccionar Archivo
                    </button>
                    <span className="text-xs text-slate-400 font-medium">PNG, JPG o SVG (máx. 2MB)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
              {/* Business Name Section */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Establecimiento</label>
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Ej. Mi Restaurante" 
                  className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium shadow-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Se utilizará en el panel superior y en los tickets de impresión.
                </p>
              </div>

              {/* Tax Rate Section */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Impuesto / IVA (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={tempTax}
                    onChange={(e) => setTempTax(Number(e.target.value))}
                    placeholder="21" 
                    className="w-full bg-white border border-slate-300 text-slate-800 pl-4 pr-12 py-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium shadow-sm"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Porcentaje aplicado al subtotal en las ventas del POS y consumos.
                </p>
              </div>
            </div>

          </div>

          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={tempName.trim() === ''}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Guardar Configuración
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-lg text-slate-800">Gestión de Usuarios</h2>
            </div>
            <button 
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          </div>

          <div className="p-0">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-bold text-sm text-slate-700">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        {user.role === 'Admin' ? <Shield className="w-3.5 h-3.5 text-amber-500" /> : <Key className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-black uppercase tracking-wider">Activo</span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'updates' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cloud Migration Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <Cloud className="w-5 h-5 text-sky-500" />
                <h2 className="font-bold text-lg text-slate-800">Sincronización en la Nube</h2>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    Actualmente el sistema está funcionando en modo <strong>100% Local (Offline)</strong>. Todos los datos están seguros en esta computadora.
                  </p>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    Migrar a la nube (Supabase) te permitirá ver el estado del restaurante, mesas y facturación <strong>desde tu teléfono en tiempo real</strong>.
                  </p>
                  
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <Database className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-1">Costo Estimado</h4>
                      <p className="text-xs text-sky-700">Supabase ofrece un plan gratuito (hasta 500MB y 2 conexiones concurrentes). Ideal para monitoreo remoto.</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleMigrateToCloud}
                  disabled={isMigrating}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isMigrating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                  {isMigrating ? 'Migrando Base de Datos...' : 'Migrar a Supabase'}
                </button>
              </div>
            </div>

            {/* System Updates Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <DownloadCloud className="w-5 h-5 text-emerald-500" />
                <h2 className="font-bold text-lg text-slate-800">Actualizaciones del Sistema</h2>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Versión Actual</p>
                      <p className="text-2xl font-black text-slate-800">{CURRENT_VERSION}</p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold border",
                      latestVersion && latestVersion !== CURRENT_VERSION
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {latestVersion && latestVersion !== CURRENT_VERSION ? 'ACTUALIZACIÓN DISP.' : 'ESTABLE'}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    El sistema contrasta automáticamente la versión local con el repositorio oficial en GitHub. Si hay una versión nueva, podrás descargar e instalar el parche sin perder datos.
                  </p>
                </div>
                
                {updateStatus === 'idle' || updateStatus === 'checking' ? (
                  <button 
                    onClick={handleCheckUpdates}
                    disabled={isUpdating}
                    className="w-full py-3 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl font-bold text-sm shadow-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {isUpdating ? 'Buscando actualizaciones...' : 'Buscar Actualización en GitHub'}
                  </button>
                ) : updateStatus === 'available' ? (
                  <button 
                    onClick={handleStartDownload}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Descargar Versión {latestVersion}
                  </button>
                ) : updateStatus === 'downloading' ? (
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <span>Descargando...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300" 
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleApplyUpdate}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 animate-pulse"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reiniciar e Instalar Ahora
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-red-200 flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h2 className="font-bold text-lg text-red-800">Zona de Peligro: Restablecer Sistema</h2>
            </div>
            <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-bold text-red-900 mb-1">Borrar Base de Datos Local</h3>
                <p className="text-sm text-red-700">Esta acción eliminará de forma permanente todas las comandas, mesas, facturas y configuración guardada. La aplicación volverá a su estado inicial de fábrica. <strong>No se puede deshacer.</strong></p>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm("⚠️ ADVERTENCIA DE SEGURIDAD ⚠️\n\n¿Estás absolutamente seguro de que quieres BORRAR TODA LA BASE DE DATOS?\nEsto eliminará todas las ventas, comandas, empleados y configuración local.\n\nEsta acción NO se puede deshacer.")) {
                    import('../db/database').then(({ db }) => {
                      db.delete().then(() => {
                        sessionStorage.clear();
                        window.location.href = "/";
                      }).catch(err => {
                        alert('Error al borrar la base de datos: ' + err);
                      });
                    });
                  }
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-red-700 transition-all whitespace-nowrap shrink-0"
              >
                Restablecer de Fábrica
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* ngrok Control Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <Network className="w-5 h-5 text-indigo-650" />
                <h2 className="font-bold text-lg text-slate-800">Túnel de Acceso Remoto (ngrok)</h2>
              </div>
              
              <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Usa este túnel para conectar de forma segura otros dispositivos (tablets de mozos, KDS de cocina o celulares) a esta PC principal a través de Internet.
                  </p>
                  
                  {/* Authtoken Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">ngrok Authtoken</label>
                    <div className="relative">
                      <input 
                        type={showToken ? "text" : "password"} 
                        value={ngrokToken}
                        onChange={(e) => setNgrokToken(e.target.value)}
                        placeholder="Pegar authtoken de ngrok.com" 
                        disabled={tunnelStatus === 'active' || tunnelStatus === 'starting'}
                        className="w-full bg-white border border-slate-300 text-slate-800 pl-4 pr-12 py-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium shadow-sm disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        disabled={tunnelStatus === 'active' || tunnelStatus === 'starting'}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Consigue tu token gratuito registrándote en <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">ngrok.com</a>.
                    </p>
                  </div>

                  {/* Port and Status */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Puerto Local</label>
                      <input 
                        type="number" 
                        value={tunnelPort}
                        onChange={(e) => setTunnelPort(Number(e.target.value))}
                        disabled={tunnelStatus === 'active' || tunnelStatus === 'starting'}
                        className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium shadow-sm disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</label>
                      <div className={cn(
                        "mt-1.5 px-3 py-2 rounded-lg text-xs font-bold text-center border",
                        tunnelStatus === 'active' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                        tunnelStatus === 'idle' && "bg-slate-50 text-slate-500 border-slate-100",
                        tunnelStatus === 'starting' && "bg-amber-50 text-amber-600 border-amber-100 animate-pulse",
                        tunnelStatus === 'error' && "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {tunnelStatus === 'active' && 'ACTIVO'}
                        {tunnelStatus === 'idle' && 'APAGADO'}
                        {tunnelStatus === 'starting' && 'INICIANDO...'}
                        {tunnelStatus === 'error' && 'ERROR'}
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                      <strong>Error:</strong> {errorMsg}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleToggleTunnel}
                  disabled={tunnelStatus === 'starting'}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2",
                    tunnelStatus === 'active'
                      ? "bg-rose-650 hover:bg-rose-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  )}
                >
                  {tunnelStatus === 'starting' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : tunnelStatus === 'active' ? (
                    <>
                      <Wifi className="w-4 h-4" />
                      Desactivar Túnel
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      Activar Túnel
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* QR and URL display card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <QrCode className="w-5 h-5 text-indigo-650" />
                <h2 className="font-bold text-lg text-slate-800">Conexión QR de Mesa y Mozo</h2>
              </div>

              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-6">
                {tunnelStatus === 'active' && qrCodeUrl ? (
                  <>
                    <p className="text-xs text-slate-500">
                      Escanea este código QR con cualquier celular o tablet para cargar la aplicación y sincronizarse automáticamente.
                    </p>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl shadow-inner animate-in zoom-in-95 duration-200">
                      <img src={qrCodeUrl} alt="Conexión QR" className="w-[180px] h-[180px] rounded-2xl" />
                    </div>
                    <div className="w-full space-y-2">
                      <div className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl">
                        <input 
                          type="text" 
                          readOnly 
                          value={tunnelUrl} 
                          className="bg-transparent text-indigo-950 font-bold text-xs flex-1 outline-none truncate text-center" 
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(tunnelUrl);
                            alert("Enlace copiado al portapapeles.");
                          }}
                          className="p-1.5 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                          title="Copiar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 space-y-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-700 text-sm">Túnel inactivo</h3>
                    <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                      El código QR y la URL de acceso público se generarán automáticamente una vez que inicies el túnel de ngrok.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Mode Switch Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
              <Server className="w-5 h-5 text-indigo-650" />
              <h2 className="font-bold text-lg text-slate-800">Modo de Base de Datos y Sincronización</h2>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Option Local */}
                <button
                  onClick={() => setSyncMode('local')}
                  className={cn(
                    "flex-1 p-6 rounded-2xl border-2 text-left transition-all flex items-start gap-4",
                    syncMode === 'local'
                      ? "border-indigo-600 bg-indigo-50/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl shrink-0",
                    syncMode === 'local' ? "bg-indigo-150 text-indigo-650" : "bg-slate-100 text-slate-500"
                  )}>
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base mb-1">Local Compartido (PC Base)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Por defecto. Los celulares se sincronizan directamente con esta PC mediante la red WiFi o el túnel de ngrok. Los datos se almacenan físicamente en este equipo.
                    </p>
                  </div>
                </button>

                {/* Option Supabase */}
                <button
                  onClick={() => setSyncMode('supabase')}
                  className={cn(
                    "flex-1 p-6 rounded-2xl border-2 text-left transition-all flex items-start gap-4",
                    syncMode === 'supabase'
                      ? "border-indigo-600 bg-indigo-50/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl shrink-0",
                    syncMode === 'supabase' ? "bg-indigo-150 text-indigo-650" : "bg-slate-100 text-slate-500"
                  )}>
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base mb-1">Nube Sincronizada (Supabase)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Los datos se sincronizan con una base de datos segura en internet. Los celulares pueden operar incluso con esta PC apagada.
                    </p>
                  </div>
                </button>
              </div>

              {syncMode === 'supabase' && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-200">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Supabase Project URL</label>
                    <input 
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzabc.supabase.co" 
                      className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Supabase Anon API Key</label>
                    <input 
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOi..." 
                      className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium shadow-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={handleSaveSyncConfig}
                  disabled={isSavingSync}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {isSavingSync ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Configuración de Sincronización
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-xl text-slate-900">{editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configurar acceso al sistema</p>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:text-rose-500 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-2 gap-10">
              {/* Left Column: Basic Info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    placeholder="Ej: Laura González"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol en el Sistema</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Admin', 'Cajero', 'Mozo', 'Cocinero', 'Superadmin Dev'].map(role => (
                      <button 
                        key={role}
                        onClick={() => setNewUser({...newUser, role})}
                        className={`py-2 px-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition-all ${
                          newUser.role === role 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                            : 'bg-slate-50 border-transparent text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PIN de Acceso</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={newUser.pin}
                    onChange={e => setNewUser({...newUser, pin: e.target.value})}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all text-center tracking-[1em]"
                    placeholder="0000"
                  />
                </div>

                <button 
                  onClick={handleAddUser}
                  disabled={!newUser.name}
                  className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {editingUserId ? 'GUARDAR CAMBIOS' : 'CREAR USUARIO'}
                </button>
              </div>

              {/* Right Column: Permissions */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permisos de Acceso</label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {MODULES.map(module => (
                    <button 
                      key={module.id}
                      onClick={() => togglePermission(module.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                        newUser.permissions.includes(module.id)
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">{module.label}</span>
                      {newUser.permissions.includes(module.id) 
                        ? <CheckCircle className="w-5 h-5 text-indigo-600" /> 
                        : <Circle className="w-5 h-5 text-slate-200" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'arca' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6 text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">Facturación Electrónica (ARCA / AFIP)</h3>
                <p className="text-xs text-slate-500 mt-1">Configura las credenciales fiscales para autorizar comprobantes en tiempo real.</p>
              </div>
              <button
                onClick={() => setShowHelpModal(true)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ¿CÓMO CONFIGURAR?
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">CUIT del Emisor</label>
                <input
                  type="text"
                  placeholder="Ej: 20-38472938-9"
                  value={arcaSettings.cuit}
                  onChange={e => setArcaSettings({...arcaSettings, cuit: e.target.value})}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Razón Social / Nombre Emisor</label>
                <input
                  type="text"
                  placeholder="Ej: Ignacio Valente"
                  value={arcaSettings.nombreEmisor}
                  onChange={e => setArcaSettings({...arcaSettings, nombreEmisor: e.target.value})}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Domicilio Comercial</label>
                <input
                  type="text"
                  placeholder="Ej: Av. Siempre Viva 123, CABA"
                  value={arcaSettings.domicilioComercial}
                  onChange={e => setArcaSettings({...arcaSettings, domicilioComercial: e.target.value})}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Fecha Inicio Monotributo</label>
                <input
                  type="date"
                  value={arcaSettings.monotributoStartDate}
                  onChange={e => setArcaSettings({...arcaSettings, monotributoStartDate: e.target.value})}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Punto de Venta Electrónico (Web Services)</label>
                <input
                  type="number"
                  placeholder="Ej: 2"
                  value={arcaSettings.puntoVenta}
                  onChange={e => setArcaSettings({...arcaSettings, puntoVenta: Number(e.target.value)})}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Modo del Entorno AFIP</label>
                <div className="flex gap-4 items-center h-10">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={arcaSettings.productionMode}
                      onChange={e => setArcaSettings({...arcaSettings, productionMode: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    Modo Producción (Real)
                  </label>
                  <span className="text-[10px] text-slate-400 block">Si está desactivado, usará el servidor de Homologación (Pruebas)</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 block mb-1">Ruta del Certificado (.crt)</label>
                <input
                  type="text"
                  placeholder="Haga clic en 'Generar' o coloque la ruta absoluta al archivo .crt"
                  value={arcaSettings.certPath}
                  onChange={e => setArcaSettings({...arcaSettings, certPath: e.target.value})}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-950 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 block mb-1">Ruta de la Llave Privada (.key)</label>
                <input
                  type="text"
                  placeholder="Haga clic en 'Generar' o coloque la ruta absoluta al archivo .key"
                  value={arcaSettings.keyPath}
                  onChange={e => setArcaSettings({...arcaSettings, keyPath: e.target.value})}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-950 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 block mb-1">Carpeta de Destino de PDFs Factura</label>
                <input
                  type="text"
                  placeholder="Ruta absoluta para guardar PDFs (Dejar vacío para usar predeterminada)"
                  value={arcaSettings.invoicePath || ''}
                  onChange={e => setArcaSettings({...arcaSettings, invoicePath: e.target.value})}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  localStorage.setItem('bar_arca_settings', JSON.stringify(arcaSettings));
                  alert("¡Configuración de ARCA guardada con éxito!");
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" /> Guardar Configuración
              </button>

              <button
                onClick={async () => {
                  if (!ipc) {
                    alert("El diagnóstico solo está disponible en el software de escritorio.");
                    return;
                  }
                  if (!arcaSettings.cuit) {
                    alert("Completa el CUIT para realizar la prueba.");
                    return;
                  }
                  setTestingArca(true);
                  setArcaDiagnosticResult(null);
                  try {
                    const res = await ipc.invoke('arca-test-connection', { arcaInfo: arcaSettings });
                    setArcaDiagnosticResult(res);
                  } catch (e: any) {
                    setArcaDiagnosticResult({ success: false, error: e.message });
                  } finally {
                    setTestingArca(false);
                  }
                }}
                disabled={testingArca}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-905 dark:bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4", testingArca && "animate-spin")} /> Test Conexión ARCA
              </button>

              <button
                onClick={async () => {
                  if (!ipc) {
                    alert("Esta función requiere la aplicación de escritorio.");
                    return;
                  }
                  if (!arcaSettings.cuit) {
                    alert("Por favor, ingresa el CUIT antes de generar la solicitud.");
                    return;
                  }
                  const name = arcaSettings.nombreEmisor || "LYNX BarOS";
                  const res = await ipc.invoke('arca-generate-csr', { cuit: arcaSettings.cuit, name });
                  if (res.success) {
                    setArcaSettings({
                      ...arcaSettings,
                      certPath: arcaSettings.certPath || `${res.folder}\\certificado.crt (Esperando archivo)`,
                      keyPath: res.keyPath
                    });
                    alert(`¡Llave privada y archivo CSR generados con éxito!\n\nSe guardaron en:\n${res.folder}\n\nUsa el archivo 'pedido.csr' para obtener tu certificado (.crt) en la web de AFIP.`);
                  } else {
                    alert("Error: " + res.error);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                <Key className="w-4 h-4" /> Generar KEY y CSR (Solicitud)
              </button>
            </div>
          </div>

          {/* DIAGNOSTIC PANEL */}
          {arcaDiagnosticResult && (
            <div className={cn(
              "p-5 rounded-2xl border animate-in fade-in duration-200 space-y-3",
              arcaDiagnosticResult.success 
                ? "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50" 
                : "bg-rose-500/10 border-rose-200 dark:border-rose-900/50"
            )}>
              <div className="flex items-center gap-2">
                {arcaDiagnosticResult.success 
                  ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                  : <AlertCircle className="w-5 h-5 text-rose-600" />
                }
                <span className="font-black text-sm uppercase tracking-wide">
                  {arcaDiagnosticResult.success ? "Conexión Exitosa con AFIP" : "Fallo de Comunicación"}
                </span>
              </div>
              <div className="text-xs space-y-1.5 font-mono">
                <p><b>Certificado:</b> {arcaDiagnosticResult.certInfo}</p>
                {arcaDiagnosticResult.success && arcaDiagnosticResult.status && (
                  <p><b>Estado Servidor:</b> AppServer: {arcaDiagnosticResult.status.AppServer} | DbServer: {arcaDiagnosticResult.status.DbServer} | AuthServer: {arcaDiagnosticResult.status.AuthServer}</p>
                )}
                {!arcaDiagnosticResult.success && (
                  <div className="space-y-1">
                    <p className="font-sans text-rose-700 dark:text-rose-400 font-bold">{arcaDiagnosticResult.error}</p>
                    {arcaDiagnosticResult.detailed && (
                      <pre className="p-3 bg-slate-950 text-slate-400 rounded-lg overflow-x-auto text-[10px] leading-relaxed max-h-40">{arcaDiagnosticResult.detailed}</pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invoice Customizer Section from Factureando */}
          <div className="mt-8">
            <InvoiceDesignSettings />
          </div>
        </div>
      )}

      {/* HELP MODAL AFIP */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 text-slate-800 dark:text-slate-105">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                Guía de Configuración ARCA (AFIP)
              </h3>
              <button 
                onClick={() => setShowHelpModal(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-sm leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs mb-1 tracking-wider text-indigo-600">Paso 1: Generar Archivos Técnicos</h4>
                <p>Haz clic en el botón <span className="font-bold">"Generar KEY y CSR"</span> en esta configuración. Selecciona una carpeta segura en tu PC. La app creará dos archivos:</p>
                <ul className="list-disc list-inside ml-3 mt-1.5 space-y-1">
                  <li><span className="font-bold">privada.key:</span> Tu clave criptográfica privada. Manténla segura en tu computadora.</li>
                  <li><span className="font-bold">pedido.csr:</span> El archivo de firma que debes subir a AFIP.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs mb-1 tracking-wider text-indigo-600">Paso 2: Obtener el Certificado en AFIP</h4>
                <ol className="list-decimal list-inside ml-3 mt-1.5 space-y-1">
                  <li>Ingresa al portal de AFIP con tu clave fiscal.</li>
                  <li>Busca y abre el servicio <span className="font-bold">"Administración de Certificados Digitales"</span>.</li>
                  <li>Sube tu archivo <span className="font-bold">pedido.csr</span> generado.</li>
                  <li>AFIP te permitirá descargar un archivo <span className="font-bold">.crt</span>.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs mb-1 tracking-wider text-indigo-650">Paso 3: Alta del Punto de Venta</h4>
                <ol className="list-decimal list-inside ml-3 mt-1.5 space-y-1">
                  <li>Busca el servicio <span className="font-bold">"Regcom" &gt; "Puntos de venta"</span> en AFIP.</li>
                  <li>Crea un nuevo punto de venta electrónico.</li>
                  <li><span className="font-bold text-amber-600 dark:text-amber-400">IMPORTANTE:</span> El tipo debe ser de factura electrónica para <span className="font-bold">"Web Services"</span>. Anota el número asignado (ej: 2).</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs mb-1 tracking-wider text-indigo-650">Paso 4: Relación de Clave Fiscal</h4>
                <ol className="list-decimal list-inside ml-3 mt-1.5 space-y-1">
                  <li>Entra a <span className="font-bold">"Administrador de Relaciones de Clave Fiscal"</span>.</li>
                  <li>Selecciona <span className="font-bold">"Nueva Relación"</span> &gt; <span className="font-bold">"Buscar"</span> &gt; <span className="font-bold">"AFIP"</span> &gt; <span className="font-bold">"WebServices"</span>.</li>
                  <li>Busca y selecciona <span className="font-bold">"Facturación Electrónica"</span>.</li>
                  <li>En el campo <span className="font-bold">"Representante"</span>, selecciona tu CUIT y haz clic en Buscar para asociar el Certificado/Alias.</li>
                  <li>Confirma la vinculación.</li>
                </ol>
              </div>

              <div className="bg-amber-500/10 border border-amber-300 dark:border-amber-900/50 p-4 rounded-2xl space-y-2">
                <span className="font-bold text-xs uppercase text-amber-600 dark:text-amber-400 block">⚠️ Configuración de Homologación (Pruebas)</span>
                <p className="text-xs">Para usar la facturación con el modo producción apagado, AFIP requiere que crees el certificado y autorices el servicio de pruebas en su portal específico de homologación usando el servicio <span className="font-bold">"WSASS"</span> vinculando tu CUIT al web service <span className="font-bold">wsfe</span>.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-6 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
