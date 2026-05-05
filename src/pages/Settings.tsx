import React, { useState, useRef } from "react";
import { useBusiness } from "../contexts/BusinessContext";
import { useStore } from "../contexts/StoreContext";
import { cn } from "../lib/utils";
import { Store, Upload, Save, Image as ImageIcon, X, Users, Shield, Trash2, Key, Plus, CheckCircle, Circle, Edit2, Cloud, Database, RefreshCw, DownloadCloud } from "lucide-react";
import { LoggerService } from "../lib/LoggerService";

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
  
  const CURRENT_VERSION = "v1.0.0";
  const GITHUB_OWNER = "lynxok"; // Usuario oficial
  const GITHUB_REPO = "Bar"; // Repositorio del bar

  const [isMigrating, setIsMigrating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const handleMigrateToCloud = async () => {
    setIsMigrating(true);
    // Simulate migration delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert("Migración a Supabase iniciada. El sistema cambiará a modo híbrido.");
    setIsMigrating(false);
  };

  const handleCheckUpdates = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
      
      if (!response.ok) {
        throw new Error('Error al conectar con GitHub');
      }

      const data = await response.json();
      const latestTag = data.tag_name; 
      
      setLatestVersion(latestTag);

      if (latestTag !== CURRENT_VERSION) {
        alert(`¡Hay una actualización disponible! (${latestTag})\n\nMejoras:\n${(data.body || 'Correcciones menores').substring(0, 150)}...`);
      } else {
        alert(`Tienes la última versión instalada (${CURRENT_VERSION}). No hay actualizaciones pendientes.`);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo verificar la actualización. Asegúrate de haber configurado tu usuario y repositorio correcto en el código.");
    } finally {
      setIsUpdating(false);
    }
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

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Configuración del Negocio</h1>
        <p className="text-slate-500 mt-2">Personaliza la apariencia y los datos principales de tu establecimiento.</p>
      </div>

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

      {/* Users Management Section */}
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
            
            <button 
              onClick={handleCheckUpdates}
              disabled={isUpdating}
              className="w-full py-3 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl font-bold text-sm shadow-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isUpdating ? 'Buscando actualizaciones...' : 'Buscar Actualización en GitHub'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 bg-red-50 rounded-2xl shadow-sm border border-red-200 overflow-hidden flex flex-col">
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
                    {['Admin', 'Cajero', 'Mozo', 'Cocinero'].map(role => (
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
    </div>
  );
}
