import { useState, useRef, useCallback } from "react";
import { 
  X, Plus, Minus, Save, Trash2, Layout, Users, RotateCw,
  ZoomIn, ZoomOut, Maximize2, Wallet, CreditCard, ArrowRightLeft,
  User, ArrowRight, ChefHat, Smartphone
} from "lucide-react";
import { cn } from "../lib/utils";
import { useStore, Table } from "../contexts/StoreContext";
import { useBusiness } from "../contexts/BusinessContext";

const MENU_ITEMS = [
  { id: '1', name: 'Burger Simple', price: 1200, category: 'Comida' },
  { id: '2', name: 'Burger Doble', price: 1500, category: 'Comida' },
  { id: '3', name: 'Papas Fritas', price: 600, category: 'Acompañamiento' },
  { id: '4', name: 'Gaseosa Cola', price: 400, category: 'Bebida' },
  { id: '5', name: 'Cerveza IPA', price: 800, category: 'Bebida' },
  { id: '6', name: 'Ensalada César', price: 1100, category: 'Comida' },
];

const isRotatable = (type: Table['type']) => type !== 'round' && type !== 'stool';

export function TableMap() {
  const { tables, updateTableOrder, closeOrder, moveTable, addTable, removeTable, updateTable, addComanda } = useStore();
  const { taxRate } = useBusiness();

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Rotate state
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [liveRotation, setLiveRotation] = useState(0);

  // Viewport state: zoom + pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [loyaltyId, setLoyaltyId] = useState('');
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Screen → canvas coordinate conversion
  const toCanvas = (sx: number, sy: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - pan.x) / zoom,
      y: (sy - rect.top  - pan.y) / zoom,
    };
  };

  // Zoom centered on cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    const newZoom = Math.min(3, Math.max(0.2, zoom * factor));
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setPan(p => ({
      x: cx - (cx - p.x) * (newZoom / zoom),
      y: cy - (cy - p.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom]);

  // Fit all tables in view
  const fitAll = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || tables.length === 0) return;
    const pad = 60;
    const minX = Math.min(...tables.map(t => t.x));
    const minY = Math.min(...tables.map(t => t.y));
    const maxX = Math.max(...tables.map(t => t.x + t.width));
    const maxY = Math.max(...tables.map(t => t.y + t.height));
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const newZoom = Math.min(3, Math.max(0.2,
      Math.min((rect.width - pad * 2) / contentW, (rect.height - pad * 2) / contentH)
    ));
    setPan({
      x: (rect.width  - contentW * newZoom) / 2 - minX * newZoom,
      y: (rect.height - contentH * newZoom) / 2 - minY * newZoom,
    });
    setZoom(newZoom);
  }, [tables]);

  const activeOrderTable = tables.find(t => t.id === selectedTableId);
  const editingTable = tables.find(t => t.id === editingTableId);
  const orderItems = activeOrderTable?.order || [];

  const handleAddItem = (item: any) => {
    const exists = orderItems.find(i => i.id === item.id);
    const newItems = exists
      ? orderItems.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      : [...orderItems, { ...item, qty: 1 }];
    updateTableOrder(selectedTableId!, newItems);
  };

  const handleRemoveItem = (id: string) => {
    const item = orderItems.find(i => i.id === id);
    const newItems = item && item.qty > 1
      ? orderItems.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i)
      : orderItems.filter(i => i.id !== id);
    updateTableOrder(selectedTableId!, newItems);
  };

  const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const taxes = subtotal * (taxRate / 100);
  const total = subtotal + taxes;

  // ---------- DRAG ----------
  const onMouseDown = (e: React.MouseEvent, table: Table) => {
    if (!isEditingLayout || rotatingId) return;
    e.stopPropagation();

    setDraggingId(table.id);
    setEditingTableId(table.id);

    // Convert to canvas space
    const c = toCanvas(e.clientX, e.clientY);
    setDragOffset({ x: c.x - table.x, y: c.y - table.y });
    setDragPos({ x: table.x, y: table.y });
  };

  // Pan on empty canvas (any mode) — middle mouse OR left in view mode
  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (!isEditingLayout && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    // Pan
    if (isPanning) {
      setPan({
        x: panStart.current.px + e.clientX - panStart.current.mx,
        y: panStart.current.py + e.clientY - panStart.current.my,
      });
      return;
    }

    if (!isEditingLayout) return;

    // Move table in canvas space
    if (draggingId) {
      const c = toCanvas(e.clientX, e.clientY);
      setDragPos({ x: c.x - dragOffset.x, y: c.y - dragOffset.y });
    }

    // Rotate
    if (rotatingId) {
      const table = tables.find(t => t.id === rotatingId);
      if (!table) return;
      const cx = (draggingId ? dragPos.x : table.x) + table.width / 2;
      const cy = (draggingId ? dragPos.y : table.y) + table.height / 2;
      // Convert mouse to canvas space for angle calc
      const c = toCanvas(e.clientX, e.clientY);
      const angle = Math.atan2(c.y - cy, c.x - cx) * (180 / Math.PI) + 90;
      setLiveRotation(angle);
    }
  }, [isPanning, draggingId, rotatingId, dragOffset, dragPos, tables, isEditingLayout, pan, zoom]);

  const onMouseUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); return; }
    if (draggingId && isEditingLayout) {
      moveTable(draggingId, Math.round(dragPos.x), Math.round(dragPos.y)).catch(console.error);
    }
    if (rotatingId && isEditingLayout) {
      updateTable(rotatingId, { rotation: Math.round(liveRotation) }).catch(console.error);
    }
    setDraggingId(null);
    setRotatingId(null);
  }, [isPanning, draggingId, rotatingId, dragPos, liveRotation, isEditingLayout, moveTable, updateTable]);

  // ---------- ROTATE handle mousedown ----------
  const onRotateHandleMouseDown = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    e.preventDefault();
    setRotatingId(table.id);
    setLiveRotation(table.rotation ?? 0);
  };

  // ---------- CREATE ----------
  const handleCreateNew = async (type: Table['type']) => {
    const suffix = Date.now().toString().slice(-4);
    const prefix = type === 'wall' ? 'W' : type === 'bar' ? 'B' : 'M';
    const newTable: Table = {
      id: `${prefix}-${suffix}`,
      status: 'available',
      order: [],
      lastUpdate: new Date().toISOString(),
      x: 160,
      y: 160,
      type,
      rotation: 0,
      width:  type === 'bar' ? 140 : type === 'wall' ? 200 : type === 'rectangle' ? 130 : type === 'stool' ? 44 : 88,
      height: type === 'bar' ? 420 : type === 'wall' ? 22  : type === 'stool' ? 44 : 88,
      capacity: type === 'stool' ? 1 : type === 'wall' ? 0 : type === 'bar' ? 0 : 4,
    };
    try {
      await addTable(newTable);
      setEditingTableId(newTable.id);
    } catch (err) {
      console.error(err);
      alert('Error al crear el elemento.');
    }
  };

  // ---------- RENDER TABLE ELEMENT ----------
  const renderTable = (table: Table) => {
    const isDragging = draggingId === table.id;
    const isRotating = rotatingId === table.id;
    const x = isDragging ? dragPos.x : table.x;
    const y = isDragging ? dragPos.y : table.y;
    const rotation = isRotating ? liveRotation : (table.rotation ?? 0);
    const isSelected = editingTableId === table.id && isEditingLayout;

    return (
      <div
        key={table.id}
        className={cn(
          "absolute select-none touch-none",
          isEditingLayout ? "cursor-move" : "cursor-pointer",
          isDragging ? "z-50" : "z-10",
        )}
        style={{
          left: x,
          top: y,
          width: table.width,
          height: table.height,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          transition: isDragging || isRotating ? 'none' : 'transform 0.15s ease',
          filter: isSelected ? 'drop-shadow(0 0 8px rgba(99,102,241,0.9))' : isDragging ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.25))' : 'none',
        }}
        onMouseDown={(e) => onMouseDown(e, table)}
        onClick={(e) => {
          if (isEditingLayout) {
            e.stopPropagation(); // prevent canvas deselect from firing
            setEditingTableId(table.id);
          } else if (table.type !== 'wall') {
            setSelectedTableId(table.id);
          }
        }}
      >
        {/* Body */}
        {table.type === 'wall' ? (
          <div className="w-full h-full bg-slate-500 border-2 border-slate-600 rounded-sm shadow-lg flex items-center justify-center overflow-hidden">
            <div className="w-full h-full opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#000 0,#000 1px,transparent 0,transparent 50%)', backgroundSize: '10px 10px' }} />
          </div>
        ) : table.type === 'bar' ? (
          <div className={cn(
            "w-full h-full bg-slate-900 border-l-8 border-amber-500 rounded-l-3xl shadow-2xl flex items-center justify-center overflow-hidden",
            isSelected ? "ring-4 ring-indigo-500 ring-offset-2" : ""
          )}>
            <div className="rotate-90 text-amber-500/20 font-black text-3xl tracking-[0.6em] uppercase whitespace-nowrap select-none">BARRA</div>
          </div>
        ) : (
          <div className={cn(
            "w-full h-full flex flex-col items-center justify-center relative border-4 shadow-lg",
            (table.type === 'round' || table.type === 'stool') ? "rounded-full" : "rounded-2xl",
            table.status === 'occupied'
              ? "bg-rose-500 border-rose-700 text-white"
              : isEditingLayout
                ? "bg-indigo-50/60 border-dashed border-indigo-300 text-indigo-700"
                : "bg-white border-slate-100 text-slate-800 hover:border-indigo-300",
          )}>
            <span className="text-[9px] font-black uppercase tracking-tight z-10 opacity-70">{table.id}</span>
            {table.type !== 'stool' && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: table.capacity }).map((_, i) => {
                  const angle = (i / table.capacity) * Math.PI * 2;
                  const r = Math.min(table.width, table.height) * 0.55;
                  const cx = table.width / 2 + Math.cos(angle) * r;
                  const cy = table.height / 2 + Math.sin(angle) * r;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "absolute w-4 h-4 rounded-full border-2 shadow-sm",
                        table.status === 'occupied' ? "bg-rose-400 border-rose-600" : "bg-slate-100 border-white"
                      )}
                      style={{ top: cy - 8, left: cx - 8 }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rotate handle — only when selected in edit mode and rotatable */}
        {isSelected && isRotatable(table.type) && (
          <div
            title="Rotar"
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center cursor-grab shadow-lg shadow-indigo-400/60 z-20 hover:bg-indigo-700 border-2 border-white"
            onMouseDown={(e) => onRotateHandleMouseDown(e, table)}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Connector line from handle to object */}
        {isSelected && isRotatable(table.type) && (
          <div className="absolute -top-6 left-1/2 -translate-x-px w-0.5 h-4 bg-indigo-400/60 pointer-events-none z-10" />
        )}
      </div>
    );
  };

  return (
    <div
      className="h-[calc(100vh-64px)] flex relative overflow-hidden bg-slate-100 select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Sidebar Toolbox */}
      {isEditingLayout && (
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-30">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/30">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-lg">
              <Layout className="w-5 h-5" /> Editor de Salón
            </h3>
            <p className="text-xs text-indigo-600 mt-1 italic">Arrastrá para mover · Icono para rotar</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-8">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Añadir Elementos</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'round',     label: 'Mesa Redonda',   icon: <div className="w-10 h-10 rounded-full border-2 border-slate-300 bg-white" /> },
                  { id: 'square',    label: 'Mesa Cuadrada',  icon: <div className="w-10 h-10 border-2 border-slate-300 rounded-md bg-white" /> },
                  { id: 'rectangle', label: 'Mesa Rectang.',  icon: <div className="w-14 h-8 border-2 border-slate-300 rounded-md bg-white" /> },
                  { id: 'stool',     label: 'Butaca Barra',   icon: <div className="w-7 h-7 rounded-full border-2 border-slate-300 bg-white" /> },
                  { id: 'wall',      label: 'Pared / Divisor',icon: <div className="w-16 h-4 bg-slate-400 rounded-sm" /> },
                  { id: 'bar',       label: 'Barra / Mostrador', icon: <div className="w-8 h-14 bg-slate-800 border-l-4 border-amber-400 rounded-l-lg" /> },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleCreateNew(item.id as Table['type'])}
                    className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all active:scale-95 bg-white shadow-sm group"
                  >
                    {item.icon}
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-700 uppercase tracking-tighter">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {editingTable ? (
              <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl space-y-5 border border-white/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Propiedades</h4>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre / ID</label>
                  <input
                    type="text"
                    value={editingTable.id}
                    onChange={(e) => updateTable(editingTable.id, { id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                {editingTable.type !== 'stool' && editingTable.type !== 'wall' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Sillas</label>
                    <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-xl border border-white/10">
                      <button onClick={() => updateTable(editingTable.id, { capacity: Math.max(1, editingTable.capacity - 1) })} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"><Minus className="w-4 h-4" /></button>
                      <span className="flex-1 text-center font-black text-lg">{editingTable.capacity}</span>
                      <button onClick={() => updateTable(editingTable.id, { capacity: editingTable.capacity + 1 })} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Ancho</label>
                    <input type="number" value={editingTable.width}
                      onChange={(e) => updateTable(editingTable.id, { width: Math.max(20, parseInt(e.target.value) || 0) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Alto</label>
                    <input type="number" value={editingTable.height}
                      onChange={(e) => updateTable(editingTable.id, { height: Math.max(10, parseInt(e.target.value) || 0) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
                  </div>
                </div>

                {isRotatable(editingTable.type) && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><RotateCw className="w-3 h-3" /> Rotación</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={0} max={359} step={1}
                        value={editingTable.rotation ?? 0}
                        onChange={(e) => updateTable(editingTable.id, { rotation: parseInt(e.target.value) })}
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="text-sm font-black w-10 text-right">{editingTable.rotation ?? 0}°</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[0, 45, 90, 135, 180].map(deg => (
                        <button key={deg} onClick={() => updateTable(editingTable.id, { rotation: deg })}
                          className={cn("flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all",
                            (editingTable.rotation ?? 0) === deg ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 hover:bg-white/10")}>
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { if (confirm('¿Eliminar elemento?')) { removeTable(editingTable.id); setEditingTableId(null); } }}
                  className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl p-6 text-center">
                <Layout className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Seleccioná un objeto para editar sus propiedades</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100">
            <button
              onClick={() => { setIsEditingLayout(false); setEditingTableId(null); }}
              className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <Save className="w-5 h-5" /> GUARDAR DISEÑO
            </button>
          </div>
        </div>
      )}

      {/* Main Map */}
      <div className="flex-1 p-8 flex flex-col relative overflow-hidden">
        <div className="mb-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-black text-4xl text-slate-900 tracking-tight">Diseño del Salón</h2>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                <Users className="w-4 h-4 text-indigo-500" />
                {tables.filter(t => t.type !== 'wall').reduce((acc, t) => acc + (t.capacity || 0), 0)} PLAZAS TOTALES
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-full shadow-sm border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {tables.filter(t => t.status === 'available' && t.type !== 'wall').length} MESAS LIBRES
              </div>
            </div>
          </div>

          {!isEditingLayout && (
            <button
              onClick={() => setIsEditingLayout(true)}
              className="flex items-center gap-3 px-8 py-4 bg-slate-900 rounded-2xl text-sm font-black text-white hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
            >
              <Layout className="w-5 h-5 text-indigo-400" /> EDITAR PLANO
            </button>
          )}
        </div>

        <div
          ref={canvasRef}
          className={cn(
            "flex-1 w-full bg-white rounded-[3.5rem] border-4 border-slate-200 relative overflow-hidden shadow-inner",
            isEditingLayout ? "ring-[12px] ring-indigo-50 border-indigo-100" : "",
            isPanning ? "cursor-grabbing" : !isEditingLayout ? "cursor-grab" : ""
          )}
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}
          onWheel={handleWheel}
          onMouseDown={onCanvasMouseDown}
          onClick={() => isEditingLayout && setEditingTableId(null)}
        >
          {/* Transformed content layer */}
          <div
            ref={contentRef}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: 0, height: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {tables.map(table => renderTable(table))}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
            <button onClick={() => { const nz = Math.min(3, zoom * 1.2); setZoom(nz); }} className="w-10 h-10 bg-white shadow-lg border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-all">
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={() => { const nz = Math.max(0.2, zoom / 1.2); setZoom(nz); }} className="w-10 h-10 bg-white shadow-lg border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-all">
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={fitAll} title="Ajustar todo" className="w-10 h-10 bg-white shadow-lg border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-all">
              <Maximize2 className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-10 h-10 bg-white shadow-lg border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-all text-[10px] font-black text-slate-500">
              1:1
            </button>
          </div>

          {/* Zoom indicator */}
          <div className="absolute bottom-6 left-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-black text-slate-500 shadow">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>

      {/* POS Modal */}
      {selectedTableId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-7xl h-[85vh] flex overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex-1 bg-slate-50/50 flex flex-col border-r border-slate-100">
              <div className="p-10 bg-white border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-3xl text-slate-900">Mesa {selectedTableId}</h3>
                <button onClick={() => setSelectedTableId(null)} className="p-2 text-slate-400 hover:text-rose-500"><X className="w-8 h-8" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-3 gap-6">
                {MENU_ITEMS.map(item => (
                  <button key={item.id} onClick={() => handleAddItem(item)}
                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-500 hover:-translate-y-1 transition-all text-left">
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{item.category}</div>
                    <div className="font-black text-slate-900 text-lg mb-4">{item.name}</div>
                    <div className="font-black text-2xl text-slate-900">${item.price}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="w-[450px] bg-white flex flex-col p-10">
              <h3 className="font-black text-2xl mb-8">Pedido Actual</h3>
              <div className="flex-1 overflow-y-auto space-y-4">
                {orderItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-3xl">
                    <div className="flex-1">
                      <div className="font-black text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400 font-bold">${item.price} × {item.qty}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleRemoveItem(item.id)} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center hover:text-rose-500"><Minus className="w-4 h-4" /></button>
                      <span className="font-black w-4 text-center">{item.qty}</span>
                      <button onClick={() => handleAddItem(item)} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center hover:text-indigo-600"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 pt-10 border-t border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Total</span>
                  <span className="text-4xl font-black text-slate-900">${total.toLocaleString()}</span>
                </div>
                <button 
                  className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-indigo-700 transition-all active:scale-95 mb-4 flex items-center justify-center gap-2" 
                  onClick={() => {
                    addComanda(selectedTableId!, orderItems);
                    setSelectedTableId(null);
                  }}
                >
                  <ChefHat className="w-6 h-6" />
                  ENVIAR A COCINA
                </button>
                <button 
                  className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg" 
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  Cobrar Cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Payment & Loyalty Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900">Cobrar Mesa {selectedTableId}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Finalizar cuenta y registrar puntos</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-3 text-slate-400 hover:bg-white hover:text-rose-500 rounded-full transition-all border border-transparent hover:border-slate-100 shadow-sm">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="p-10 space-y-8">
              {/* Payment Methods */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'Efectivo', icon: Wallet, label: 'Efectivo' },
                    { id: 'Tarjeta', icon: CreditCard, label: 'Tarjeta' },
                    { id: 'Transferencia', icon: ArrowRightLeft, label: 'Transf.' },
                    { id: 'Billetera', icon: Smartphone, label: 'Billetera' },
                  ].map(method => (
                    <button 
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.98]",
                        paymentMethod === method.id 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                          : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                      )}
                    >
                      <method.icon className={cn("h-5 w-5", paymentMethod === method.id ? "text-white" : "text-indigo-500")} />
                      <span className="text-xs font-black uppercase tracking-wider">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Loyalty ID */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fidelización (Opcional)</label>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full uppercase">Suma 10% en Puntos</span>
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input 
                    id="global-scanner-focus"
                    type="text" 
                    value={loyaltyId}
                    onChange={e => setLoyaltyId(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    placeholder="DNI o N° de Socio (F2)"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold italic">Si no es socio, puedes registrarlo en la sección de Fidelización.</p>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 space-y-4 text-white shadow-2xl">
                <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest px-2">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest px-2">
                  <span>Impuesto ({taxRate}%)</span>
                  <span>${taxes.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-800 mx-2" />
                <div className="flex justify-between items-center px-2">
                  <div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total a Cobrar</div>
                    <div className="text-4xl font-black">${total.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Puntos a Sumar</div>
                    <div className="text-xl font-black text-emerald-400">+{Math.floor(total / 10)} pts</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  closeOrder(selectedTableId!, paymentMethod, loyaltyId);
                  setIsPaymentModalOpen(false);
                  setSelectedTableId(null);
                  setLoyaltyId('');
                  setPaymentMethod('Efectivo');
                }}
                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                FINALIZAR Y COBRAR <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
