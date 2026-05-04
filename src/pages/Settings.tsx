import { useState, useRef } from "react";
import { useBusiness } from "../contexts/BusinessContext";
import { Store, Upload, Save, Image as ImageIcon, X } from "lucide-react";

export function Settings() {
  const { businessName, setBusinessName, logo, setLogo } = useBusiness();
  const [tempName, setTempName] = useState(businessName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setBusinessName(tempName);
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

          <div className="border-t border-slate-100 pt-8"></div>

          {/* Business Name Section */}
          <div className="max-w-md">
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
    </div>
  );
}
