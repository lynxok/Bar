import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Upload, Save, Sliders, Palette, FileText, RefreshCw, FilePenLine } from "lucide-react";
import { generateInvoicePDF } from "../utils/pdfGenerator";

const mockInvoice = {
  id: "2026-9999",
  ptoVta: 2,
  voucherNumber: 3,
  date: new Date().toISOString().split('T')[0],
  amount: 20600,
  description: "Hamburguesas Simples y Papas Fritas - Consumos de Mesa 01",
  clientCuit: "20369106539",
  clientName: "CONSUMIDOR FINAL",
  cae: "86238304087136",
  caeVto: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

export default function InvoiceDesignSettings() {
  const [activeTab, setActiveTab] = useState<'design' | 'logos' | 'spacing'>('design');
  const [saving, setSaving] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>("");

  const [settings, setSettings] = useState({
    cuit: "",
    nombreEmisor: "",
    domicilioComercial: "",
    monotributoStartDate: "",
    puntoVenta: 2,
    certPath: "",
    keyPath: "",
    productionMode: false,
    invoicePath: "",
    // Campos estéticos
    nombreFantasia: "",
    ingresosBrutos: "",
    invoiceLogo: "",
    pdfColorPalette: "slate",
    pdfLogoPosition: "izquierda",
    pdfLogoSizeWidth: 30,
    pdfLynxLogo: "",
    pdfLynxPosition: "abajo_derecha",
    pdfLynxSize: 25,
    pdfLynxOpacity: 0.08,
    pdfHeaderHeight: 55,
    pdfCompanyNameSize: 16,
    pdfCompanyNameY: 25,
    pdfRightColTitleSize: 18,
    pdfRightColDetailsSize: 9,
    pdfRightColY: 15,
    pdfInvoiceTypeX: 95,
    pdfInvoiceTypeY: 10,
    pdfTableStartY: 98,
    pdfLeftColAlign: "centrado",
    pdfLeftColX: 15,
    pdfRightColX: 110,
    pdfLogoX: 15,
    pdfLogoY: 12,
  });

  // Load config on mount from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('bar_arca_settings');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setSettings(prev => ({
          ...prev,
          ...data,
          // Fallbacks para campos estéticos si no existen
          nombreFantasia: data.nombreFantasia || data.nombreEmisor || "",
          ingresosBrutos: data.ingresosBrutos || data.cuit || "",
          pdfColorPalette: data.pdfColorPalette || "slate",
          pdfLogoPosition: data.pdfLogoPosition || "izquierda",
          pdfLogoSizeWidth: data.pdfLogoSizeWidth ? Number(data.pdfLogoSizeWidth) : 30,
          pdfHeaderHeight: data.pdfHeaderHeight ? Number(data.pdfHeaderHeight) : 55,
          pdfCompanyNameSize: data.pdfCompanyNameSize ? Number(data.pdfCompanyNameSize) : 16,
          pdfCompanyNameY: data.pdfCompanyNameY ? Number(data.pdfCompanyNameY) : 25,
          pdfRightColTitleSize: data.pdfRightColTitleSize ? Number(data.pdfRightColTitleSize) : 18,
          pdfRightColDetailsSize: data.pdfRightColDetailsSize ? Number(data.pdfRightColDetailsSize) : 9,
          pdfRightColY: data.pdfRightColY ? Number(data.pdfRightColY) : 15,
          pdfInvoiceTypeX: data.pdfInvoiceTypeX ? Number(data.pdfInvoiceTypeX) : 95,
          pdfInvoiceTypeY: data.pdfInvoiceTypeY ? Number(data.pdfInvoiceTypeY) : 10,
          pdfTableStartY: data.pdfTableStartY ? Number(data.pdfTableStartY) : 98,
          pdfLeftColAlign: data.pdfLeftColAlign || "centrado",
          pdfLeftColX: data.pdfLeftColX ? Number(data.pdfLeftColX) : 15,
          pdfRightColX: data.pdfRightColX ? Number(data.pdfRightColX) : 110,
          pdfLogoX: data.pdfLogoX ? Number(data.pdfLogoX) : 15,
          pdfLogoY: data.pdfLogoY ? Number(data.pdfLogoY) : 12,
        }));
      } catch (e) {
        console.error("Error parsing arca settings:", e);
      }
    }
  }, []);

  // Update real-time PDF preview URL (Debounced)
  useEffect(() => {
    let active = true;
    const updatePreview = async () => {
      try {
        const url = await generateInvoicePDF(mockInvoice, settings);
        if (active) {
          setPdfPreviewUrl(url);
        }
      } catch (err) {
        console.error("Error updating PDF preview:", err);
      }
    };

    const timer = setTimeout(() => {
      updatePreview();
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [settings]);

  // Handle logo change for business logo
  const handleBusinessLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSettings(prev => ({ ...prev, invoiceLogo: event.target.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle logo change for LYNX logo
  const handleLynxLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSettings(prev => ({ ...prev, pdfLynxLogo: event.target.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveSettings = () => {
    setSaving(true);
    try {
      localStorage.setItem('bar_arca_settings', JSON.stringify(settings));
      alert("Diseño y configuraciones de factura guardados exitosamente.");
    } catch (error: any) {
      alert(`Error al guardar diseño: ${error.message}`);
    }
    setSaving(false);
  };

  const resetLynxLogo = () => {
    setSettings(prev => ({ ...prev, pdfLynxLogo: "" }));
  };

  const palettes = [
    { id: "slate", name: "Pizarra Clásica", primary: "bg-[#1e293b]", secondary: "bg-[#94a3b8]" },
    { id: "blue", name: "Azul Profesional", primary: "bg-[#1e3a8a]", secondary: "bg-[#60a5fa]" },
    { id: "emerald", name: "Verde Esmeralda", primary: "bg-[#064e3b]", secondary: "bg-[#34d299]" },
    { id: "amber", name: "Ámbar Premium", primary: "bg-[#78350f]", secondary: "bg-[#fbc124]" },
    { id: "monochrome", name: "Monocromo", primary: "bg-[#000000]", secondary: "bg-[#71717a]" },
    { id: "soft_white", name: "Blanco Minimalista", primary: "bg-[#f1f5f9] border border-slate-300", secondary: "bg-[#cbd5e1]" }
  ];

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline p-6 space-y-6 text-on-surface">
      <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
        <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
          <ImageIcon size={22} />
        </div>
        <div>
          <h3 className="text-lg font-black text-on-surface">Personalización Visual del Comprobante PDF</h3>
          <p className="text-xs text-on-surface-variant">Ajusta márgenes, logos, colores y alineación en tiempo real para la factura impresa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Config Controls */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Tabs Selector */}
          <div className="flex border-b border-outline-variant pb-2 gap-4">
            <button 
              type="button"
              onClick={() => setActiveTab('design')}
              className={`text-xs font-bold uppercase pb-2 transition-colors flex items-center gap-2 ${activeTab === 'design' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Palette size={14} /> Diseño & Datos
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('logos')}
              className={`text-xs font-bold uppercase pb-2 transition-colors flex items-center gap-2 ${activeTab === 'logos' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <ImageIcon size={14} /> Logos
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('spacing')}
              className={`text-xs font-bold uppercase pb-2 transition-colors flex items-center gap-2 ${activeTab === 'spacing' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Sliders size={14} /> Alineación & Márgenes
            </button>
          </div>

          {/* TAB: DISEÑO & DATOS */}
          {activeTab === 'design' && (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold mb-3">Paleta de Colores de la Factura</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {palettes.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleInputChange('pdfColorPalette', p.id)}
                      className={`flex items-center justify-between p-3 border rounded-xl text-left transition-all cursor-pointer ${settings.pdfColorPalette === p.id ? 'border-primary bg-primary/5 shadow-sm text-primary' : 'border-outline-variant hover:border-outline'}`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">{p.name}</span>
                      <div className="flex gap-1">
                        <span className={`w-3.5 h-3.5 rounded-full ${p.primary}`} />
                        <span className={`w-3.5 h-3.5 rounded-full ${p.secondary}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-outline-variant p-4 rounded-xl bg-surface-container-low space-y-4">
                <h4 className="text-xs font-black tracking-wider text-primary uppercase flex items-center gap-1.5">
                  <FilePenLine size={14} className="text-primary" /> Datos del Emisor en el PDF
                </h4>
                
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Nombre Comercial / Fantasía (Cabecera Izq.)</label>
                  <input 
                    type="text" 
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-on-surface" 
                    placeholder="Ej: Loaiza Martha"
                    value={settings.nombreFantasia}
                    onChange={(e) => handleInputChange('nombreFantasia', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Dirección Comercial (Cabecera Izq.)</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-lg border border-outline-variant bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-on-surface resize-none" 
                    placeholder="Ej: Av. General Paz 120, Paraná"
                    value={settings.domicilioComercial}
                    onChange={(e) => handleInputChange('domicilioComercial', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant block mb-1">Inicio de Actividad</label>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-on-surface" 
                      placeholder="Ej: 01/05/2026"
                      value={settings.monotributoStartDate}
                      onChange={(e) => handleInputChange('monotributoStartDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant block mb-1">Ingresos Brutos</label>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-on-surface" 
                      placeholder="Ej: 20-36910653-9"
                      value={settings.ingresosBrutos}
                      onChange={(e) => handleInputChange('ingresosBrutos', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LOGOS */}
          {activeTab === 'logos' && (
            <div className="space-y-6">
              
              <div className="border border-outline-variant p-4 rounded-xl bg-surface-container-low">
                <h4 className="text-xs font-black tracking-wider text-primary uppercase mb-4">Logo del Comercio</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant block mb-1">Posición del Logo</label>
                    <select 
                      className="w-full h-10 px-2 rounded-lg border border-outline-variant bg-white dark:bg-slate-950 text-sm outline-none text-on-surface" 
                      value={settings.pdfLogoPosition}
                      onChange={(e) => handleInputChange('pdfLogoPosition', e.target.value)}
                    >
                      <option value="izquierda">Cabecera Izquierda</option>
                      <option value="derecha">Cabecera Derecha</option>
                      <option value="oculto">Ocultar Logo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-on-surface-variant block mb-1">Ancho del Logo ({settings.pdfLogoSizeWidth} mm)</label>
                    <input 
                      type="range"
                      min="15"
                      max="60"
                      className="w-full accent-primary mt-3"
                      value={settings.pdfLogoSizeWidth}
                      onChange={(e) => handleInputChange('pdfLogoSizeWidth', Number(e.target.value))}
                    />
                  </div>

                  {settings.pdfLogoPosition !== "oculto" && (
                    <>
                      <div>
                        <div className="flex justify-between mb-1 text-[11px] font-mono text-on-surface-variant">
                          <span>Alineación Horizontal X</span>
                          <span className="font-bold">{settings.pdfLogoX} mm</span>
                        </div>
                        <input 
                          type="range" min="5" max="150" className="w-full accent-primary" 
                          value={settings.pdfLogoX}
                          onChange={(e) => handleInputChange('pdfLogoX', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1 text-[11px] font-mono text-on-surface-variant">
                          <span>Alineación Vertical Y</span>
                          <span className="font-bold">{settings.pdfLogoY} mm</span>
                        </div>
                        <input 
                          type="range" min="5" max="50" className="w-full accent-primary" 
                          value={settings.pdfLogoY}
                          onChange={(e) => handleInputChange('pdfLogoY', Number(e.target.value))}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="border-2 border-dashed border-outline-variant rounded-xl p-4 text-center hover:bg-surface-container transition-colors relative cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={handleBusinessLogoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto mb-2 text-on-surface-variant" size={24} />
                  <p className="text-xs text-on-surface font-bold uppercase">Cargar Imagen de Logo</p>
                  {settings.invoiceLogo && <p className="text-[10px] text-emerald-600 font-mono mt-1 uppercase">✓ Logo cargado</p>}
                </div>
              </div>

              <div className="border border-outline-variant p-4 rounded-xl bg-surface-container-low">
                <h4 className="text-xs font-black tracking-wider text-primary uppercase mb-4">Marca de LYNX (Branding)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant block mb-1">Ubicación en Hoja</label>
                    <select 
                      className="w-full h-10 px-2 rounded-lg border border-outline-variant bg-white dark:bg-slate-950 text-sm outline-none text-on-surface" 
                      value={settings.pdfLynxPosition}
                      onChange={(e) => handleInputChange('pdfLynxPosition', e.target.value)}
                    >
                      <option value="abajo_derecha">Abajo Derecha (Pie de pág.)</option>
                      <option value="abajo_izquierda">Abajo Izquierda (Pie de pág.)</option>
                      <option value="abajo_centro">Abajo al Centro (Pie de pág.)</option>
                      <option value="marca_agua">Centro (Marca de Agua)</option>
                      <option value="oculto">Ocultar de la Factura</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-on-surface-variant block mb-1">Ancho del Logo ({settings.pdfLynxSize} mm)</label>
                    <input 
                      type="range"
                      min="10"
                      max="60"
                      className="w-full accent-primary mt-3"
                      value={settings.pdfLynxSize}
                      onChange={(e) => handleInputChange('pdfLynxSize', Number(e.target.value))}
                    />
                  </div>

                  {settings.pdfLynxPosition === "marca_agua" && (
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-on-surface-variant block mb-1">Opacidad de Marca de Agua ({(settings.pdfLynxOpacity * 100).toFixed(0)}%)</label>
                      <input 
                        type="range"
                        min="0.02"
                        max="0.30"
                        step="0.01"
                        className="w-full accent-primary mt-1"
                        value={settings.pdfLynxOpacity}
                        onChange={(e) => handleInputChange('pdfLynxOpacity', Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="border-2 border-dashed border-outline-variant rounded-xl p-4 text-center hover:bg-surface-container transition-colors relative cursor-pointer flex-1">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg" 
                      onChange={handleLynxLogoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="mx-auto mb-1 text-on-surface-variant" size={20} />
                    <p className="text-[10px] text-on-surface font-bold uppercase">Subir logo LYNX personalizado</p>
                    {settings.pdfLynxLogo && <p className="text-[10px] text-emerald-600 font-mono mt-1 uppercase">✓ Logo personalizado</p>}
                  </div>

                  {settings.pdfLynxLogo && (
                    <button 
                      type="button" 
                      onClick={resetLynxLogo}
                      className="px-4 py-2 border border-rose-250 text-rose-600 rounded-lg hover:bg-rose-50 text-xs font-bold"
                    >
                      Restaurar
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB: SPACING & ALIGNMENTS */}
          {activeTab === 'spacing' && (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              
              <div>
                <h4 className="text-xs font-black text-primary uppercase mb-2">Dimensiones Generales</h4>
                <div className="space-y-3 bg-surface-container-low p-3 border border-outline-variant rounded-xl">
                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Altura de Cabecera</span>
                      <span className="font-bold">{settings.pdfHeaderHeight} mm</span>
                    </div>
                    <input 
                      type="range" min="35" max="75" className="w-full accent-primary" 
                      value={settings.pdfHeaderHeight}
                      onChange={(e) => handleInputChange('pdfHeaderHeight', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Inicio de Tabla de Ítems</span>
                      <span className="font-bold">{settings.pdfTableStartY} mm</span>
                    </div>
                    <input 
                      type="range" min="70" max="115" className="w-full accent-primary" 
                      value={settings.pdfTableStartY}
                      onChange={(e) => handleInputChange('pdfTableStartY', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-primary uppercase mb-2">Columna Izquierda (Fantasía)</h4>
                <div className="space-y-3 bg-surface-container-low p-3 border border-outline-variant rounded-xl">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant block mb-1">Alineación de Texto</label>
                    <select
                      className="w-full h-10 px-2 rounded-lg border border-outline-variant bg-white dark:bg-slate-950 text-sm outline-none text-on-surface"
                      value={settings.pdfLeftColAlign}
                      onChange={(e) => handleInputChange('pdfLeftColAlign', e.target.value)}
                    >
                      <option value="centrado">Centrado en bloque izquierdo</option>
                      <option value="izquierda">Alineado a la Izquierda</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Posición Horizontal (Margen X)</span>
                      <span className="font-bold">{settings.pdfLeftColX} mm</span>
                    </div>
                    <input 
                      type="range" min="5" max="50" className="w-full accent-primary" 
                      value={settings.pdfLeftColX}
                      onChange={(e) => handleInputChange('pdfLeftColX', Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Posición Vertical (Alineación Y)</span>
                      <span className="font-bold">{settings.pdfCompanyNameY} mm</span>
                    </div>
                    <input 
                      type="range" min="12" max="60" className="w-full accent-primary" 
                      value={settings.pdfCompanyNameY}
                      onChange={(e) => handleInputChange('pdfCompanyNameY', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Tamaño de Fuente Nombre</span>
                      <span className="font-bold">{settings.pdfCompanyNameSize} px</span>
                    </div>
                    <input 
                      type="range" min="10" max="24" className="w-full accent-primary" 
                      value={settings.pdfCompanyNameSize}
                      onChange={(e) => handleInputChange('pdfCompanyNameSize', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-primary uppercase mb-2">Columna Derecha (Factura)</h4>
                <div className="space-y-3 bg-surface-container-low p-3 border border-outline-variant rounded-xl">
                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Posición Horizontal (Margen X)</span>
                      <span className="font-bold">{settings.pdfRightColX} mm</span>
                    </div>
                    <input 
                      type="range" min="80" max="140" className="w-full accent-primary" 
                      value={settings.pdfRightColX}
                      onChange={(e) => handleInputChange('pdfRightColX', Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Posición Vertical (Alineación Y)</span>
                      <span className="font-bold">{settings.pdfRightColY} mm</span>
                    </div>
                    <input 
                      type="range" min="12" max="50" className="w-full accent-primary" 
                      value={settings.pdfRightColY}
                      onChange={(e) => handleInputChange('pdfRightColY', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Tamaño Fuente "FACTURA"</span>
                      <span className="font-bold">{settings.pdfRightColTitleSize} px</span>
                    </div>
                    <input 
                      type="range" min="12" max="24" className="w-full accent-primary" 
                      value={settings.pdfRightColTitleSize}
                      onChange={(e) => handleInputChange('pdfRightColTitleSize', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                      <span>Tamaño Fuente Detalles</span>
                      <span className="font-bold">{settings.pdfRightColDetailsSize} px</span>
                    </div>
                    <input 
                      type="range" min="7" max="13" className="w-full accent-primary" 
                      value={settings.pdfRightColDetailsSize}
                      onChange={(e) => handleInputChange('pdfRightColDetailsSize', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-primary uppercase mb-2">Caja Comprobante C (Centro)</h4>
                <div className="space-y-3 bg-surface-container-low p-3 border border-outline-variant rounded-xl">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                        <span>Posición X</span>
                        <span className="font-bold">{settings.pdfInvoiceTypeX} mm</span>
                      </div>
                      <input 
                        type="range" min="85" max="115" className="w-full accent-primary" 
                        value={settings.pdfInvoiceTypeX}
                        onChange={(e) => handleInputChange('pdfInvoiceTypeX', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-xs text-on-surface-variant">
                        <span>Posición Y</span>
                        <span className="font-bold">{settings.pdfInvoiceTypeY} mm</span>
                      </div>
                      <input 
                        type="range" min="10" max="40" className="w-full accent-primary" 
                        value={settings.pdfInvoiceTypeY}
                        onChange={(e) => handleInputChange('pdfInvoiceTypeY', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          <button 
            type="button"
            onClick={saveSettings} 
            disabled={saving}
            className="w-full h-14 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar Configuración de Diseño'}
          </button>
        </div>

        {/* Live Preview Pane */}
        <div className="lg:col-span-6 flex flex-col h-[650px] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-primary" /> Vista Previa del PDF Impreso
            </label>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin text-emerald-600" /> Tiempo Real
            </span>
          </div>
          
          <div className="flex-1 bg-surface-container p-2 rounded-xl border border-outline-variant relative overflow-hidden flex items-center justify-center shadow-inner">
            {pdfPreviewUrl ? (
              <iframe 
                src={pdfPreviewUrl} 
                className="w-full h-full rounded-lg border-0 bg-white"
                title="Vista Previa PDF"
              />
            ) : (
              <div className="text-center opacity-40">
                <ImageIcon size={48} className="mx-auto mb-2 animate-pulse text-primary" />
                <p className="text-xs font-bold uppercase tracking-wider">Generando PDF...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
