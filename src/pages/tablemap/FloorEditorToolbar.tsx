import React from 'react';
import { 
  Layout, Plus, Minus, Trash2, Smartphone, Save, X, Star, ArrowRight, RotateCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Table } from '../../contexts/StoreContext';

interface FloorEditorToolbarProps {
  editingTable?: Table;
  floorPlans: Array<{ id: number | string; name: string; timestamp: string; isDefault?: boolean }>;
  showSavedPlans: boolean;
  newLayoutName: string;
  onSetNewLayoutName: (name: string) => void;
  onToggleSavedPlans: () => void;
  onSaveFloorPlan: (name: string) => void;
  onLoadFloorPlan: (id: any) => void;
  onDeleteFloorPlan: (id: any) => void;
  onSetDefaultFloorPlan: (id: any) => void;
  onClose: () => void;
  onCreateNew: (type: Table['type']) => void;
  onUpdateTable: (tableId: string, patch: Partial<Table>) => void;
  onDeleteSelected: () => void;
  onOpenQrModal: (tableId: string) => void;
  adjustChair: (table: Table, side: 'top' | 'bottom' | 'left' | 'right', delta: number) => void;
}

const isRotatable = (type: Table['type']) => type !== 'round' && type !== 'stool';

export function FloorEditorToolbar({
  editingTable,
  floorPlans,
  showSavedPlans,
  newLayoutName,
  onSetNewLayoutName,
  onToggleSavedPlans,
  onSaveFloorPlan,
  onLoadFloorPlan,
  onDeleteFloorPlan,
  onSetDefaultFloorPlan,
  onClose,
  onCreateNew,
  onUpdateTable,
  onDeleteSelected,
  onOpenQrModal,
  adjustChair,
}: FloorEditorToolbarProps) {
  return (
    <aside className="w-80 bg-white dark:bg-[#182C24] border-r border-slate-200 dark:border-white/10 flex flex-col shadow-2xl z-30 shrink-0">
      <div className="p-6 border-b border-slate-100 dark:border-white/10 bg-emerald-50/50 dark:bg-[#0F6B41]/10 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[#0F6B41] dark:text-emerald-400 flex items-center gap-2 text-base">
            <Layout className="w-5 h-5" /> Editor de salón
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Arrastrá para mover · Ícono para rotar</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer"
        >
          Cerrar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div>
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Añadir elementos</h4>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'round',     label: 'Mesa redonda',   icon: <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-white/30 bg-white dark:bg-white/5" /> },
              { id: 'square',    label: 'Mesa cuadrada',  icon: <div className="w-8 h-8 border-2 border-slate-300 dark:border-white/30 rounded-md bg-white dark:bg-white/5" /> },
              { id: 'rectangle', label: 'Mesa rectang.',  icon: <div className="w-12 h-7 border-2 border-slate-300 dark:border-white/30 rounded-md bg-white dark:bg-white/5" /> },
              { id: 'stool',     label: 'Butaca barra',   icon: <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-white/30 bg-white dark:bg-white/5" /> },
              { id: 'wall',      label: 'Pared / divisor',icon: <div className="w-14 h-3.5 bg-slate-400 rounded-xs" /> },
              { id: 'bar',       label: 'Barra',          icon: <div className="w-6 h-12 bg-slate-800 border-l-4 border-[#FA4515] rounded-l-md" /> },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => onCreateNew(item.id as Table['type'])}
                className="flex flex-col items-center justify-center gap-2 p-3 border border-slate-200 dark:border-white/10 rounded-xl hover:border-[#0F6B41] hover:bg-emerald-50/40 dark:hover:bg-[#0F6B41]/10 transition-all active:scale-95 bg-white dark:bg-white/5 shadow-xs cursor-pointer group"
              >
                {item.icon}
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#0F6B41] dark:group-hover:text-emerald-300 text-center leading-tight">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {editingTable ? (
          <div className="bg-[#1E4437] text-white p-5 rounded-2xl shadow-lg space-y-4 border border-[#0F6B41]/30">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Propiedades</h4>
              <button
                onClick={onDeleteSelected}
                className="p-1.5 text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 rounded-lg transition-colors cursor-pointer"
                title="Eliminar elemento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Nombre / ID</label>
              <input
                type="text"
                value={editingTable.id}
                onChange={(e) => onUpdateTable(editingTable.id, { id: e.target.value })}
                className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400 font-semibold"
              />
            </div>

            {editingTable.type !== 'stool' && editingTable.type !== 'wall' && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-300">Capacidad (sillas)</label>
                <div className="flex items-center gap-3 bg-white/10 p-1.5 rounded-xl border border-white/15">
                  <button
                    onClick={() => {
                      const newCap = Math.max(1, editingTable.capacity - 1);
                      const half = Math.floor(newCap / 2);
                      onUpdateTable(editingTable.id, { 
                        capacity: newCap, 
                        chairsConfig: editingTable.chairsConfig ? { top: half, bottom: newCap - half, left: 0, right: 0 } : undefined 
                      });
                    }}
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center font-bold text-base tabular-nums">{editingTable.capacity}</span>
                  <button
                    onClick={() => {
                      const newCap = editingTable.capacity + 1;
                      const half = Math.floor(newCap / 2);
                      onUpdateTable(editingTable.id, { 
                        capacity: newCap, 
                        chairsConfig: editingTable.chairsConfig ? { top: half, bottom: newCap - half, left: 0, right: 0 } : undefined 
                      });
                    }}
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {/* Presets */}
                <div className="flex gap-1.5">
                  {[2, 4, 6, 8].map(cap => {
                    const half = Math.floor(cap / 2);
                    return (
                      <button
                        key={cap}
                        onClick={() => {
                          onUpdateTable(editingTable.id, {
                            capacity: cap,
                            chairsConfig: (editingTable.type === 'round' || editingTable.type === 'stool')
                              ? undefined
                              : { top: half, bottom: cap - half, left: 0, right: 0 }
                          });
                        }}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer",
                          editingTable.capacity === cap 
                            ? "bg-[#0F6B41] border-emerald-400 text-white" 
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                        )}
                      >
                        {cap} P
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Ancho</label>
                <input
                  type="number"
                  value={editingTable.width}
                  onChange={(e) => onUpdateTable(editingTable.id, { width: Math.max(20, parseInt(e.target.value) || 0) })}
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-emerald-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Alto</label>
                <input
                  type="number"
                  value={editingTable.height}
                  onChange={(e) => onUpdateTable(editingTable.id, { height: Math.max(10, parseInt(e.target.value) || 0) })}
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {isRotatable(editingTable.type) && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <RotateCw className="w-3 h-3 text-emerald-300" /> Rotación
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={359}
                    step={1}
                    value={editingTable.rotation ?? 0}
                    onChange={(e) => onUpdateTable(editingTable.id, { rotation: parseInt(e.target.value) })}
                    className="flex-1 accent-[#0F6B41]"
                  />
                  <span className="text-xs font-bold w-9 text-right tabular-nums">{editingTable.rotation ?? 0}°</span>
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  {[0, 45, 90, 135, 180].map(deg => (
                    <button
                      key={deg}
                      onClick={() => onUpdateTable(editingTable.id, { rotation: deg })}
                      className={cn(
                        "flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer",
                        (editingTable.rotation ?? 0) === deg
                          ? "bg-[#0F6B41] border-emerald-400 text-white"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                      )}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editingTable.type !== 'wall' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Mozo asignado</label>
                <input
                  type="text"
                  value={editingTable.waiterName || ''}
                  onChange={(e) => onUpdateTable(editingTable.id, { waiterName: e.target.value })}
                  placeholder="Nombre del mozo..."
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-400 font-semibold placeholder:text-slate-400"
                />
              </div>
            )}

            {(editingTable.type === 'square' || editingTable.type === 'rectangle') && (
              <div className="space-y-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
                <h5 className="text-[10px] font-bold uppercase text-emerald-300 tracking-wider">Disposición de sillas</h5>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      const cap = editingTable.capacity || 4;
                      const half = Math.floor(cap / 2);
                      onUpdateTable(editingTable.id, {
                        chairsConfig: { top: half, bottom: cap - half, left: 0, right: 0 },
                        capacity: cap
                      });
                    }}
                    className="py-1.5 bg-white/10 hover:bg-white/20 text-[10px] font-semibold rounded-lg cursor-pointer"
                  >
                    Paralelo H
                  </button>
                  <button
                    onClick={() => {
                      const cap = editingTable.capacity || 4;
                      const half = Math.floor(cap / 2);
                      onUpdateTable(editingTable.id, {
                        chairsConfig: { top: 0, bottom: 0, left: half, right: cap - half },
                        capacity: cap
                      });
                    }}
                    className="py-1.5 bg-white/10 hover:bg-white/20 text-[10px] font-semibold rounded-lg cursor-pointer"
                  >
                    Paralelo V
                  </button>
                  <button
                    onClick={() => onUpdateTable(editingTable.id, { chairsConfig: undefined })}
                    className="py-1.5 bg-white/10 hover:bg-white/20 text-[10px] font-semibold rounded-lg cursor-pointer"
                  >
                    Radial
                  </button>
                  <button
                    onClick={() => {
                      onUpdateTable(editingTable.id, {
                        chairsConfig: { top: 0, bottom: 0, left: 0, right: 0 },
                        capacity: 0
                      });
                    }}
                    className="py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-semibold rounded-lg cursor-pointer"
                  >
                    Quitar todas
                  </button>
                </div>

                <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-white/10">
                  <span className="text-[9px] font-semibold text-slate-300 uppercase">Ajuste de bordes</span>
                  <div className="relative w-36 h-36 flex items-center justify-center bg-black/20 rounded-full border border-white/10">
                    <div className="absolute top-1 flex flex-col items-center">
                      <span className="text-[8px] font-bold text-slate-400">N</span>
                      <div className="flex gap-1 items-center">
                        <button onClick={() => adjustChair(editingTable, 'top', -1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer">-</button>
                        <span className="w-5 text-center text-xs font-bold tabular-nums">{editingTable.chairsConfig?.top || 0}</span>
                        <button onClick={() => adjustChair(editingTable, 'top', 1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer">+</button>
                      </div>
                    </div>
                    <div className="flex justify-between w-full px-1">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-bold text-slate-400">O</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => adjustChair(editingTable, 'left', -1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer">-</button>
                          <span className="w-5 text-center text-xs font-bold tabular-nums">{editingTable.chairsConfig?.left || 0}</span>
                          <button onClick={() => adjustChair(editingTable, 'left', 1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer">+</button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-bold text-slate-400">E</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => adjustChair(editingTable, 'right', -1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer">-</button>
                          <span className="w-5 text-center text-xs font-bold tabular-nums">{editingTable.chairsConfig?.right || 0}</span>
                          <button onClick={() => adjustChair(editingTable, 'right', 1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer">+</button>
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-1 flex flex-col items-center">
                      <div className="flex gap-1 items-center">
                        <button onClick={() => adjustChair(editingTable, 'bottom', -1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer">-</button>
                        <span className="w-5 text-center text-xs font-bold tabular-nums">{editingTable.chairsConfig?.bottom || 0}</span>
                        <button onClick={() => adjustChair(editingTable, 'bottom', 1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer">+</button>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 mt-0.5">S</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => onOpenQrModal(editingTable.id)}
              className="w-full py-2.5 bg-white/10 text-emerald-200 border border-white/15 rounded-xl text-xs font-semibold hover:bg-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" /> Generar código QR
            </button>
          </div>
        ) : (
          <div className="h-36 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center">
            <Layout className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-semibold">Seleccioná un elemento para ver y editar sus propiedades</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 space-y-3">
        <button
          onClick={onToggleSavedPlans}
          className="w-full py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {showSavedPlans ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {showSavedPlans ? 'Cerrar plantillas' : 'Mis plantillas'}
        </button>

        {showSavedPlans ? (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {floorPlans.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 italic">No tenés plantillas guardadas</p>
            ) : (
              floorPlans.map(plan => (
                <div key={plan.id} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-2.5 flex flex-col gap-1.5 group hover:border-[#0F6B41]/40 transition-all shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{plan.name}</p>
                        {plan.isDefault && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400">{new Date(plan.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => onLoadFloorPlan(plan.id)}
                        className="p-1.5 text-[#0F6B41] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Cargar"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteFloorPlan(plan.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {!plan.isDefault && (
                    <button 
                      onClick={() => onSetDefaultFloorPlan(plan.id)}
                      className="w-full py-1 text-[10px] font-semibold text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-md transition-all flex items-center justify-center gap-1 border border-dashed border-transparent hover:border-amber-300 cursor-pointer"
                    >
                      <Star className="w-3 h-3" /> Predeterminada
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nombre del salón..."
              value={newLayoutName}
              onChange={(e) => onSetNewLayoutName(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 text-xs font-semibold outline-none focus:border-[#0F6B41]"
            />
            <button
              onClick={() => onSaveFloorPlan(newLayoutName)}
              className="p-2.5 bg-emerald-50 dark:bg-[#0F6B41]/20 text-[#0F6B41] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer"
              title="Guardar diseño actual"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-slate-100 dark:border-white/10">
        <button
          onClick={onClose}
          className="w-full py-3 bg-[#0F6B41] hover:bg-[#0F6B41]/90 text-white rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
        >
          <Save className="w-4 h-4" /> Guardar y salir
        </button>
      </div>
    </aside>
  );
}
