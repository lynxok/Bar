import React, { useState, useRef, useCallback, useEffect } from "react";
import { 
  X, Plus, Minus, Save, Trash2, Layout, Users, RotateCw,
  ZoomIn, ZoomOut, Maximize2, Wallet, CreditCard, ArrowRightLeft,
  User, ArrowRight, ChefHat, Smartphone, Star
} from "lucide-react";
import QRCode from 'qrcode';
import { cn } from "../lib/utils";
import { useStore, Table } from "../contexts/StoreContext";
import { useBusiness } from "../contexts/BusinessContext";
import { db } from "../db/database";

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
  const { tables, updateTableOrder, closeOrder, moveTable, addTable, removeTable, updateTable, addComanda, floorPlans, saveFloorPlan, loadFloorPlan, deleteFloorPlan, setDefaultFloorPlan } = useStore();
  const { taxRate } = useBusiness();

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);

  const handleCleanTable = async (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateTable(tableId, { status: 'available', order: [], lastUpdate: new Date().toISOString() });
    } catch (err) {
      console.error(err);
    }
  };

  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [isMarqueeMode, setIsMarqueeMode] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [waiterFilter, setWaiterFilter] = useState<string>("Todos");
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [qrModalTableId, setQrModalTableId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (qrModalTableId) {
      const url = `${window.location.origin}/#/cliente/${qrModalTableId}`;
      QRCode.toDataURL(url, { width: 300, margin: 2 })
        .then(url => setQrUrl(url))
        .catch(err => console.error(err));
    } else {
      setQrUrl('');
    }
  }, [qrModalTableId]);

  const dragStartPointer = useRef({ x: 0, y: 0 });
  const initialPositions = useRef<Record<string, { x: number, y: number }>>({});
  const editingTable = tables.find(t => selectedTableIds.has(t.id));

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Rotate state
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [liveRotation, setLiveRotation] = useState(0);

  // Resizing state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, rotation: 0, tlx0: 0, tly0: 0 });

  // Listener para borrar mesas seleccionadas con la tecla Suprimir (Delete)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!isEditingLayout || selectedTableIds.size === 0) return;

      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'SELECT' ||
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isInput) return; // Evitar borrar si se está escribiendo en el panel de propiedades

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (confirm(`¿Deseas eliminar las ${selectedTableIds.size} mesas seleccionadas?`)) {
          const idsArray = Array.from(selectedTableIds);
          try {
            await Promise.all(idsArray.map(id => db.salonTables.delete(id)));
            setSelectedTableIds(new Set());
          } catch (err) {
            console.error(err);
            alert('Error al eliminar mesas en lote.');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingLayout, selectedTableIds, tables]);

  // Viewport state: zoom + pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [loyaltyId, setLoyaltyId] = useState('');
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Auxiliary Chair Adjustment (Min 44px targets)
  const adjustChair = (table: Table, side: 'top' | 'bottom' | 'left' | 'right', delta: number) => {
    const current = table.chairsConfig || { top: 0, bottom: 0, left: 0, right: 0 };
    const newVal = Math.max(0, (current[side] || 0) + delta);
    const updatedConfig = { ...current, [side]: newVal };
    const totalCapacity = updatedConfig.top + updatedConfig.bottom + updatedConfig.left + updatedConfig.right;
    
    updateTable(table.id, {
      chairsConfig: updatedConfig,
      capacity: totalCapacity
    }).catch(console.error);
  };

  // Acople de mesas (Merge)
  const handleMergeTables = async (targetTableId: string) => {
    if (!mergeSourceId || mergeSourceId === targetTableId) return;
    const source = tables.find(t => t.id === mergeSourceId);
    const target = tables.find(t => t.id === targetTableId);
    
    if (!source || !target) return;
    
    // Consolidar ítems del pedido
    const consolidatedOrder = [...target.order];
    source.order.forEach(item => {
      const exists = consolidatedOrder.find(i => i.id === item.id);
      if (exists) {
        exists.qty += item.qty;
      } else {
        consolidatedOrder.push({ ...item });
      }
    });

    try {
      await db.transaction('rw', db.salonTables, async () => {
        await db.salonTables.update(mergeSourceId, {
          order: [],
          status: 'available',
          lastUpdate: new Date().toISOString()
        });
        await db.salonTables.update(targetTableId, {
          order: consolidatedOrder,
          status: consolidatedOrder.length > 0 ? 'occupied_no_order' : 'available',
          lastUpdate: new Date().toISOString()
        });
      });
    } catch (err) {
      console.error(err);
      alert('Error al fusionar las mesas.');
    }
    setMergeSourceId(null);
  };

  // Fusión masiva de múltiples mesas seleccionadas en el último elemento seleccionado
  const handleMergeSelectedGroup = async () => {
    if (selectedTableIds.size < 2) return;
    const ids = Array.from(selectedTableIds);
    // El objetivo es la última mesa de la selección
    const targetId = ids[ids.length - 1];
    const sourceIds = ids.slice(0, ids.length - 1);
    
    const target = tables.find(t => t.id === targetId);
    if (!target) return;

    if (!confirm(`¿Unir las ${ids.length} mesas seleccionadas en la mesa ${targetId}?`)) return;

    const consolidatedOrder = [...target.order];
    
    for (const sId of sourceIds) {
      const src = tables.find(t => t.id === sId);
      if (src) {
        src.order.forEach(item => {
          const exists = consolidatedOrder.find(i => i.id === item.id);
          if (exists) {
            exists.qty += item.qty;
          } else {
            consolidatedOrder.push({ ...item });
          }
        });
      }
    }

    try {
      await db.transaction('rw', db.salonTables, async () => {
        for (const sId of sourceIds) {
          await db.salonTables.update(sId, {
            order: [],
            status: 'available',
            lastUpdate: new Date().toISOString()
          });
        }
        await db.salonTables.update(targetId, {
          order: consolidatedOrder,
          status: consolidatedOrder.length > 0 ? 'occupied_no_order' : 'available',
          lastUpdate: new Date().toISOString()
        });
      });
      alert(`Unión grupal completada en la mesa ${targetId}.`);
      setSelectedTableIds(new Set());
    } catch (err) {
      console.error(err);
      alert('Error al fusionar el grupo de mesas.');
    }
  };

  const handleResizeStart = (e: React.PointerEvent, table: Table) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const canvasCoord = toCanvas(e.clientX, e.clientY);
    setResizingId(table.id);
    
    const rad = (table.rotation || 0) * (Math.PI / 180);
    const tlx0 = table.x + table.width/2 - (table.width/2)*Math.cos(rad) + (table.height/2)*Math.sin(rad);
    const tly0 = table.y + table.height/2 - (table.width/2)*Math.sin(rad) - (table.height/2)*Math.cos(rad);
    
    resizeStart.current = {
      x: canvasCoord.x,
      y: canvasCoord.y,
      w: table.width,
      h: table.height,
      rotation: table.rotation ?? 0,
      tlx0,
      tly0
    };
  };

  const handleResizeMove = (e: React.PointerEvent, table: Table) => {
    if (resizingId !== table.id) return;
    e.stopPropagation();
    
    const canvasCoord = toCanvas(e.clientX, e.clientY);
    const rad = resizeStart.current.rotation * (Math.PI / 180);
    
    const dx = canvasCoord.x - resizeStart.current.tlx0;
    const dy = canvasCoord.y - resizeStart.current.tly0;
    
    let newWidth = Math.max(44, Math.round(dx * Math.cos(rad) + dy * Math.sin(rad)));
    let newHeight = Math.max(44, Math.round(-dx * Math.sin(rad) + dy * Math.cos(rad)));
    
    if (table.type === 'round' || table.type === 'stool') {
      const size = Math.max(newWidth, newHeight);
      newWidth = size;
      newHeight = size;
    }
    
    const newX = resizeStart.current.tlx0 - (newWidth/2) * (1 - Math.cos(rad)) - (newHeight/2) * Math.sin(rad);
    const newY = resizeStart.current.tly0 - (newHeight/2) * (1 - Math.cos(rad)) + (newWidth/2) * Math.sin(rad);
    
    updateTable(table.id, { 
      width: newWidth, 
      height: newHeight, 
      x: newX, 
      y: newY 
    }).catch(console.error);
  };

  const handleResizeEnd = (e: React.PointerEvent, table: Table) => {
    if (resizingId === table.id) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setResizingId(null);
      updateTable(table.id, { 
        width: table.width, 
        height: table.height, 
        x: table.x, 
        y: table.y 
      }).catch(console.error);
    }
  };

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
  }, [zoom]);

  const adjustZoom = (factor: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newZoom = Math.min(3, Math.max(0.2, zoom * factor));
    setPan(p => ({
      x: cx - (cx - p.x) * (newZoom / zoom),
      y: cy - (cy - p.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  };

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

  // Disparar auto-escala automáticamente al montar el componente una vez que se cargan las mesas
  useEffect(() => {
    if (tables.length > 0) {
      const timer = setTimeout(() => {
        fitAll();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [tables.length > 0]);

  const activeOrderTable = tables.find(t => t.id === selectedTableId);
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

  // ---------- DRAG & MARQUEE SELECTION ----------
  const onMouseDown = (e: React.MouseEvent, table: Table) => {
    if (!isEditingLayout && !isMarqueeMode) return;
    if (isEditingLayout && rotatingId) return;
    e.stopPropagation();

    if (isEditingLayout) {
      setDraggingId(table.id);

      if (!selectedTableIds.has(table.id)) {
        setSelectedTableIds(new Set([table.id]));
      }

      const c = toCanvas(e.clientX, e.clientY);
      setDragOffset({ x: c.x - table.x, y: c.y - table.y });
      setDragPos({ x: table.x, y: table.y });

      dragStartPointer.current = { x: c.x, y: c.y };
      const initPos: Record<string, { x: number, y: number }> = {};
      tables.forEach(t => {
        if (selectedTableIds.has(t.id) || t.id === table.id) {
          initPos[t.id] = { x: t.x, y: t.y };
        }
      });
      initialPositions.current = initPos;
    }
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (isMarqueeMode && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      const coord = toCanvas(e.clientX, e.clientY);
      setSelectionBox({ x1: coord.x, y1: coord.y, x2: coord.x, y2: coord.y });
      setSelectedTableIds(new Set());
      return;
    }

    if (e.button === 1 || e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: panStart.current.px + e.clientX - panStart.current.mx,
        y: panStart.current.py + e.clientY - panStart.current.my,
      });
      return;
    }

    if (selectionBox && isMarqueeMode) {
      const coord = toCanvas(e.clientX, e.clientY);
      const nextBox = { ...selectionBox, x2: coord.x, y2: coord.y };
      setSelectionBox(nextBox);

      const mLeft = Math.min(nextBox.x1, nextBox.x2);
      const mRight = Math.max(nextBox.x1, nextBox.x2);
      const mTop = Math.min(nextBox.y1, nextBox.y2);
      const mBottom = Math.max(nextBox.y1, nextBox.y2);

      const hits = new Set<string>();
      tables.forEach(t => {
        if (t.type === 'wall' || t.type === 'bar') return;
        const tLeft = t.x;
        const tRight = t.x + t.width;
        const tTop = t.y;
        const tBottom = t.y + t.height;

        const overlaps = (tLeft < mRight) && (tRight > mLeft) && (tTop < mBottom) && (tBottom > mTop);
        if (overlaps) {
          hits.add(t.id);
        }
      });
      setSelectedTableIds(hits);
      return;
    }

    if (!isEditingLayout) return;

    if (draggingId) {
      const c = toCanvas(e.clientX, e.clientY);
      const dx = c.x - dragStartPointer.current.x;
      const dy = c.y - dragStartPointer.current.y;

      if (selectedTableIds.has(draggingId)) {
        const mainTableInit = initialPositions.current[draggingId];
        if (mainTableInit) {
          setDragPos({ x: Math.round((mainTableInit.x + dx) / 10) * 10, y: Math.round((mainTableInit.y + dy) / 10) * 10 });
        }
        tables.forEach(t => {
          if (selectedTableIds.has(t.id)) {
            const init = initialPositions.current[t.id];
            if (init) {
              updateTable(t.id, {
                x: Math.round((init.x + dx) / 10) * 10,
                y: Math.round((init.y + dy) / 10) * 10
              }).catch(console.error);
            }
          }
        });
      } else {
        setDragPos({ x: Math.round((c.x - dragOffset.x) / 10) * 10, y: Math.round((c.y - dragOffset.y) / 10) * 10 });
      }
    }

    if (rotatingId) {
      const table = tables.find(t => t.id === rotatingId);
      if (!table) return;
      const cx = (draggingId ? dragPos.x : table.x) + table.width / 2;
      const cy = (draggingId ? dragPos.y : table.y) + table.height / 2;
      const c = toCanvas(e.clientX, e.clientY);
      const angle = Math.atan2(c.y - cy, c.x - cx) * (180 / Math.PI) + 90;
      setLiveRotation(angle);
    }
  }, [isPanning, draggingId, rotatingId, dragOffset, dragPos, tables, isEditingLayout, pan, zoom, selectionBox, isMarqueeMode, selectedTableIds, updateTable]);

  const onMouseUp = useCallback(async () => {
    if (isPanning) { setIsPanning(false); return; }
    
    if (selectionBox) {
      setSelectionBox(null);
      return;
    }

    if (draggingId && isEditingLayout) {
      if (selectedTableIds.has(draggingId)) {
        try {
          await Promise.all(
            Array.from(selectedTableIds).map(async (id) => {
              const t = tables.find(tbl => tbl.id === id);
              if (t) {
                await db.salonTables.update(id, { x: t.x, y: t.y });
              }
            })
          );
        } catch (err) {
          console.error(err);
        }
      } else {
        await moveTable(draggingId, Math.round(dragPos.x / 10) * 10, Math.round(dragPos.y / 10) * 10);
      }
    }

    if (rotatingId && isEditingLayout) {
      await updateTable(rotatingId, { rotation: Math.round(liveRotation) });
    }
    setDraggingId(null);
    setRotatingId(null);
  }, [isPanning, draggingId, rotatingId, dragPos, liveRotation, isEditingLayout, selectedTableIds, tables, moveTable, updateTable, selectionBox]);

  const onRotateHandleMouseDown = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    e.preventDefault();
    setRotatingId(table.id);
    setLiveRotation(table.rotation ?? 0);
  };

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
      setSelectedTableIds(new Set([newTable.id]));
    } catch (err) {
      console.error(err);
      alert('Error al crear el elemento.');
    }
  };

  const STATUS_CLASSES: Record<Table['status'], string> = {
    available: "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-600/20 text-white shadow-emerald-100/50 shadow-md",
    occupied_no_order: "bg-gradient-to-br from-sky-400 to-sky-600 border-sky-600/20 text-white shadow-sky-100/50 shadow-md",
    waiting_food: "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-600/20 text-white shadow-amber-100/50 shadow-md",
    consuming: "bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-600/20 text-white shadow-indigo-100/50 shadow-md",
    checkout: "bg-gradient-to-br from-rose-500 to-pink-600 border-rose-600/20 text-white shadow-rose-100/50 shadow-md animate-pulse",
    dirty: "bg-gradient-to-br from-slate-400 to-slate-500 border-slate-500/20 text-white shadow-slate-100/50 shadow-md",
    occupied: "bg-gradient-to-br from-rose-500 to-pink-600 border-rose-600/20 text-white shadow-rose-100/50 shadow-md animate-pulse",
  };

  const ChairCircle = ({ cx, cy, status }: { cx: number, cy: number, status: string, key?: string | number }) => {
    const dotColors: Record<string, string> = {
      available: "bg-emerald-500",
      occupied_no_order: "bg-sky-500",
      waiting_food: "bg-amber-500",
      consuming: "bg-indigo-600",
      checkout: "bg-rose-500",
      dirty: "bg-slate-400",
      occupied: "bg-rose-500",
    };
    return (
      <div
        className="absolute w-5 h-5 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center transition-all z-20"
        style={{ top: cy - 10, left: cx - 10 }}
      >
        <div className={cn("w-2.5 h-2.5 rounded-full", dotColors[status] || "bg-slate-300")} />
      </div>
    );
  };

  const renderChairs = (table: Table) => {
    if (table.type === 'stool' || table.type === 'wall' || table.type === 'bar') return null;

    if (table.type === 'round' || !table.chairsConfig) {
      const totalChairs = table.chairsConfig
        ? (table.chairsConfig.top + table.chairsConfig.bottom + table.chairsConfig.left + table.chairsConfig.right)
        : table.capacity;

      return (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: totalChairs }).map((_, i) => {
            const angle = (i / totalChairs) * Math.PI * 2;
            const r = Math.min(table.width, table.height) * 0.55;
            const cx = table.width / 2 + Math.cos(angle) * r;
            const cy = table.height / 2 + Math.sin(angle) * r;
            return <ChairCircle key={i} cx={cx} cy={cy} status={table.status} />;
          })}
        </div>
      );
    }

    const { top = 0, bottom = 0, left = 0, right = 0 } = table.chairsConfig;
    const S = 12;
    const chairs: React.ReactNode[] = [];

    for (let j = 0; j < top; j++) {
      const cx = (table.width / (top + 1)) * (j + 1);
      chairs.push(<ChairCircle key={`t-${j}`} cx={cx} cy={-S} status={table.status} />);
    }
    for (let j = 0; j < bottom; j++) {
      const cx = (table.width / (bottom + 1)) * (j + 1);
      chairs.push(<ChairCircle key={`b-${j}`} cx={cx} cy={table.height + S} status={table.status} />);
    }
    for (let j = 0; j < left; j++) {
      const cy = (table.height / (left + 1)) * (j + 1);
      chairs.push(<ChairCircle key={`l-${j}`} cx={-S} cy={cy} status={table.status} />);
    }
    for (let j = 0; j < right; j++) {
      const cy = (table.height / (right + 1)) * (j + 1);
      chairs.push(<ChairCircle key={`r-${j}`} cx={table.width + S} cy={cy} status={table.status} />);
    }

    return <div className="absolute inset-0 pointer-events-none">{chairs}</div>;
  };

  const getTableTimer = (table: Table) => {
    if (table.status === 'available' || table.status === 'dirty' || !table.lastUpdate) return null;
    const elapsedMinutes = Math.floor((Date.now() - new Date(table.lastUpdate).getTime()) / 60000);
    const baseSize = Math.min(table.width, table.height);
    const fontSize = Math.max(9, Math.round(baseSize * 0.1));
    const isLateWaiting = table.status === 'waiting_food' && elapsedMinutes >= 15;
    return (
      <div 
        className={cn(
          "flex items-center gap-1 font-black mt-1 px-2 py-0.5 rounded-full text-white z-10 transition-all",
          isLateWaiting 
            ? "bg-rose-600 animate-bounce shadow-md" 
            : "bg-black/10 opacity-90"
        )}
        style={{ fontSize: `${fontSize}px` }}
      >
        <span>⏱ {elapsedMinutes}m</span>
      </div>
    );
  };

  const renderTable = (table: Table) => {
    const isDragging = draggingId === table.id;
    const isRotating = rotatingId === table.id;
    const x = isDragging ? dragPos.x : table.x;
    const y = isDragging ? dragPos.y : table.y;
    const rotation = isRotating ? liveRotation : (table.rotation ?? 0);
    const isSelected = selectedTableIds.has(table.id) && (isEditingLayout || isMarqueeMode);

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
        onMouseEnter={() => {
          if (!isEditingLayout && !draggingId && !isPanning) {
            setHoveredTableId(table.id);
          }
        }}
        onMouseLeave={() => setHoveredTableId(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (isEditingLayout) {
            if (!isMarqueeMode) {
              setSelectedTableIds(new Set([table.id]));
            } else {
              const next = new Set(selectedTableIds);
              if (next.has(table.id)) {
                next.delete(table.id);
              } else {
                next.add(table.id);
              }
              setSelectedTableIds(next);
            }
          } else if (table.type !== 'wall') {
            if (isMarqueeMode) {
              const next = new Set(selectedTableIds);
              if (next.has(table.id)) {
                next.delete(table.id);
              } else {
                next.add(table.id);
              }
              setSelectedTableIds(next);
            } else {
              if (isMergeMode) {
                if (!mergeSourceId) {
                  if (table.status === 'available') {
                    alert('Debes seleccionar una mesa ocupada como origen.');
                    return;
                  }
                  setMergeSourceId(table.id);
                } else {
                  if (table.id === mergeSourceId) {
                    setMergeSourceId(null);
                    return;
                  }
                  setMergeTargetId(table.id);
                }
              } else {
                setSelectedTableId(table.id);
              }
            }
          }
        }}
      >
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
            "w-full h-full flex flex-col items-center justify-center relative border shadow-lg transition-all overflow-visible",
            (table.type === 'round' || table.type === 'stool') ? "rounded-full" : "rounded-2xl",
            STATUS_CLASSES[table.status] || "bg-white border-slate-100 text-slate-800"
          )}>
            {/* Glass inner ring reflection */}
            <div className={cn(
              "absolute inset-1 border pointer-events-none opacity-25 z-0",
              (table.type === 'round' || table.type === 'stool') ? "rounded-full border-white" : "rounded-xl border-white"
            )} />
            {(() => {
              const baseSize = Math.min(table.width, table.height);
              const fontSizeId = Math.max(9, Math.round(baseSize * 0.11));
              const fontSizeWaiter = Math.max(8, Math.round(baseSize * 0.09));
              return (
                <>
                  <span 
                    className="font-black uppercase tracking-tight z-10 opacity-70"
                    style={{ fontSize: `${fontSizeId}px` }}
                  >
                    {table.id}
                  </span>
                  {table.waiterName && (
                    <span 
                      className="font-black bg-black/10 px-1 rounded uppercase scale-90 mt-0.5"
                      style={{ fontSize: `${fontSizeWaiter}px` }}
                    >
                      {table.waiterName}
                    </span>
                  )}
                </>
              );
            })()}
            {getTableTimer(table)}
            {renderChairs(table)}
          </div>
        )}

        {isSelected && isEditingLayout && isRotatable(table.type) && (
          <div
            title="Rotar"
            className="absolute -top-12 left-1/2 -translate-x-1/2 w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center cursor-grab shadow-xl shadow-indigo-400/60 z-20 hover:bg-indigo-700 border-2 border-white transition-all active:scale-95"
            onMouseDown={(e) => onRotateHandleMouseDown(e, table)}
          >
            <RotateCw className="w-5 h-5" />
          </div>
        )}

        {isSelected && isEditingLayout && isRotatable(table.type) && (
          <div className="absolute -top-6 left-1/2 -translate-x-px w-0.5 h-4 bg-indigo-400/60 pointer-events-none z-10" />
        )}

        {isSelected && isEditingLayout && (
          <div
            className="absolute right-0 bottom-0 w-11 h-11 flex items-center justify-center cursor-se-resize translate-x-4 translate-y-4 z-30 group/resize animate-in zoom-in-50 duration-200"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, table)}
            onPointerMove={(e) => handleResizeMove(e, table)}
            onPointerUp={(e) => handleResizeEnd(e, table)}
          >
            <div className="w-4 h-4 bg-indigo-600 border-2 border-white rounded-full shadow-md group-hover/resize:scale-125 transition-transform" />
          </div>
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Sillas</label>
                    <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-xl border border-white/10">
                      <button onClick={() => {
                        const newCap = Math.max(1, editingTable.capacity - 1);
                        const half = Math.floor(newCap / 2);
                        updateTable(editingTable.id, { 
                          capacity: newCap, 
                          chairsConfig: editingTable.chairsConfig ? { top: half, bottom: newCap - half, left: 0, right: 0 } : undefined 
                        });
                      }} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"><Minus className="w-4 h-4" /></button>
                      <span className="flex-1 text-center font-black text-lg">{editingTable.capacity}</span>
                      <button onClick={() => {
                        const newCap = editingTable.capacity + 1;
                        const half = Math.floor(newCap / 2);
                        updateTable(editingTable.id, { 
                          capacity: newCap, 
                          chairsConfig: editingTable.chairsConfig ? { top: half, bottom: newCap - half, left: 0, right: 0 } : undefined 
                        });
                      }} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"><Plus className="w-4 h-4" /></button>
                    </div>
                    {/* Capacity Presets */}
                    <div className="flex gap-1.5">
                      {[2, 4, 6, 8].map(cap => {
                        const half = Math.floor(cap / 2);
                        return (
                          <button
                            key={cap}
                            onClick={() => {
                              updateTable(editingTable.id, {
                                capacity: cap,
                                chairsConfig: (editingTable.type === 'round' || editingTable.type === 'stool')
                                  ? undefined
                                  : { top: half, bottom: cap - half, left: 0, right: 0 }
                              });
                            }}
                            className={cn(
                              "flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all",
                              editingTable.capacity === cap 
                                ? "bg-indigo-600 border-indigo-500 text-white" 
                                : "bg-white/5 border-white/10 hover:bg-white/10"
                            )}
                          >
                            {cap} P
                          </button>
                        );
                      })}
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

                {editingTable.type !== 'wall' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mozo Asignado</label>
                    <input
                      type="text"
                      value={editingTable.waiterName || ''}
                      onChange={(e) => updateTable(editingTable.id, { waiterName: e.target.value })}
                      placeholder="Nombre del Mozo..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                )}

                {(editingTable.type === 'square' || editingTable.type === 'rectangle') && (
                  <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Disposición de Sillas</h5>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const cap = editingTable.capacity || 4;
                          const half = Math.floor(cap / 2);
                          updateTable(editingTable.id, {
                            chairsConfig: { top: half, bottom: cap - half, left: 0, right: 0 },
                            capacity: cap
                          });
                        }}
                        className="py-2 bg-white/10 hover:bg-white/20 text-[9px] font-bold rounded-lg uppercase"
                      >
                        Paralelo H
                      </button>
                      <button
                        onClick={() => {
                          const cap = editingTable.capacity || 4;
                          const half = Math.floor(cap / 2);
                          updateTable(editingTable.id, {
                            chairsConfig: { top: 0, bottom: 0, left: half, right: cap - half },
                            capacity: cap
                          });
                        }}
                        className="py-2 bg-white/10 hover:bg-white/20 text-[9px] font-bold rounded-lg uppercase"
                      >
                        Paralelo V
                      </button>
                      <button
                        onClick={() => {
                          updateTable(editingTable.id, { chairsConfig: undefined });
                        }}
                        className="py-2 bg-white/10 hover:bg-white/20 text-[9px] font-bold rounded-lg uppercase"
                      >
                        Radial
                      </button>
                      <button
                        onClick={() => {
                          updateTable(editingTable.id, {
                            chairsConfig: { top: 0, bottom: 0, left: 0, right: 0 },
                            capacity: 0
                          });
                        }}
                        className="py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[9px] font-bold rounded-lg uppercase"
                      >
                        Quitar Todas
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Ajuste de Bordes</span>
                      <div className="relative w-40 h-40 flex items-center justify-center bg-black/20 rounded-full border border-white/5">
                        
                        <div className="absolute top-1 flex flex-col items-center">
                          <span className="text-[8px] font-black text-slate-500">N</span>
                          <div className="flex gap-1 items-center">
                            <button onClick={() => adjustChair(editingTable, 'top', -1)} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm transition-colors">-</button>
                            <span className="w-6 text-center text-xs font-black flex items-center justify-center">{editingTable.chairsConfig?.top || 0}</span>
                            <button onClick={() => adjustChair(editingTable, 'top', 1)} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm transition-colors">+</button>
                          </div>
                        </div>

                        <div className="flex justify-between w-full px-1">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-500">O</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => adjustChair(editingTable, 'left', -1)} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm transition-colors">-</button>
                              <span className="w-6 text-center text-xs font-black">{editingTable.chairsConfig?.left || 0}</span>
                              <button onClick={() => adjustChair(editingTable, 'left', 1)} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm transition-colors">+</button>
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-500">E</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => adjustChair(editingTable, 'right', -1)} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm transition-colors">-</button>
                              <span className="w-6 text-center text-xs font-black">{editingTable.chairsConfig?.right || 0}</span>
                              <button onClick={() => adjustChair(editingTable, 'right', 1)} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm transition-colors">+</button>
                            </div>
                          </div>
                        </div>

                        <div className="absolute bottom-1 flex flex-col items-center">
                          <div className="flex gap-1 items-center">
                            <button onClick={() => adjustChair(editingTable, 'bottom', -1)} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm transition-colors">-</button>
                            <span className="w-6 text-center text-xs font-black flex items-center justify-center">{editingTable.chairsConfig?.bottom || 0}</span>
                            <button onClick={() => adjustChair(editingTable, 'bottom', 1)} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm transition-colors">+</button>
                          </div>
                          <span className="text-[8px] font-black text-slate-500 mt-0.5">S</span>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setQrModalTableId(editingTable.id)}
                  className="w-full py-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2 mb-2"
                >
                  <Smartphone className="w-4 h-4" /> Generar Código QR
                </button>

                <button
                  onClick={() => { if (confirm('¿Eliminar elemento?')) { removeTable(editingTable.id); setSelectedTableIds(new Set()); } }}
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

          <div className="px-5 pb-5 space-y-4">
            <button
              onClick={() => setShowSavedPlans(!showSavedPlans)}
              className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 flex items-center justify-center gap-2 transition-all"
            >
              {showSavedPlans ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {showSavedPlans ? 'Cerrar Plantillas' : 'Mis Plantillas'}
            </button>

            {showSavedPlans ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {floorPlans.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4 italic">No tienes plantillas guardadas</p>
                ) : (
                  floorPlans.map(plan => (
                    <div key={plan.id} className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col gap-2 group hover:border-indigo-200 transition-all shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-800 truncate">{plan.name}</p>
                            {plan.isDefault && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium">{new Date(plan.timestamp).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => loadFloorPlan(plan.id)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Cargar"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { if(confirm('¿Eliminar esta plantilla?')) deleteFloorPlan(plan.id); }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {!plan.isDefault && (
                        <button 
                          onClick={() => setDefaultFloorPlan(plan.id)}
                          className="w-full py-1 text-[9px] font-black text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all flex items-center justify-center gap-1 border border-dashed border-transparent hover:border-amber-200"
                        >
                          <Star className="w-3 h-3" /> MARCAR COMO PREDETERMINADO
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
                  placeholder="Nombre del evento..."
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => {
                    if (!newLayoutName) return alert('Ingresá un nombre para la configuración');
                    saveFloorPlan(newLayoutName);
                    setNewLayoutName("");
                    alert('Configuración guardada!');
                  }}
                  className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all"
                  title="Guardar diseño actual"
                >
                  <Save className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100">
            <button
              onClick={() => { setIsEditingLayout(false); setSelectedTableIds(new Set()); }}
              className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <Save className="w-5 h-5" /> GUARDAR DISEÑO
            </button>
          </div>
        </div>
      )}

      {/* Main Map */}
      <div className="flex-1 p-8 flex flex-col relative overflow-hidden">
        {isEditingLayout && (
          <div className="mb-4 bg-amber-500 text-amber-950 px-4 py-3 rounded-2xl border border-amber-600 shadow-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 animate-bounce" />
              <span className="font-bold text-sm tracking-wide">MODO EDICIÓN ACTIVO: Estás modificando el diseño del salón. Los cambios afectarán la vista de ventas.</span>
            </div>
            <button
              onClick={() => { setIsEditingLayout(false); setSelectedTableIds(new Set()); }}
              className="bg-amber-950 text-amber-300 hover:bg-amber-900 px-3 py-1 rounded-xl text-xs font-black uppercase transition-colors"
            >
              Guardar y Salir
            </button>
          </div>
        )}
        <div className="mb-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
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
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm ml-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mozo:</span>
                <select
                  value={waiterFilter}
                  onChange={(e) => setWaiterFilter(e.target.value)}
                  className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
                >
                  <option value="Todos">Todos</option>
                  {Array.from(new Set(tables.map(t => t.waiterName).filter(Boolean))).map(name => (
                    <option key={name} value={name!}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {!isEditingLayout && !isMarqueeMode && (
              <button
                onClick={() => {
                  if (isMergeMode) {
                    setIsMergeMode(false);
                    setMergeSourceId(null);
                    setMergeTargetId(null);
                  } else {
                    const activeOccupied = tables.filter(t => t.status !== 'available' && t.type !== 'wall');
                    if (activeOccupied.length === 0) {
                      alert('No hay mesas ocupadas para iniciar una unión.');
                      return;
                    }
                    setIsMergeMode(true);
                    setMergeSourceId(null);
                    setMergeTargetId(null);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-sm border",
                  isMergeMode
                    ? "bg-rose-500 border-rose-500 text-white animate-pulse"
                    : "bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100"
                )}
              >
                {isMergeMode ? `Cancelando fusión visual` : 'Unir Mesas (Merge)'}
              </button>
            )}

            {isEditingLayout && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsMarqueeMode(!isMarqueeMode);
                    setSelectedTableIds(new Set());
                  }}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black transition-all shadow-sm border active:scale-95",
                    isMarqueeMode 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-100" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Layout className="w-5 h-5 text-indigo-400" /> SELECCIÓN MÚLTIPLE: {isMarqueeMode ? 'ON' : 'OFF'}
                </button>
              </div>
            )}

            {!isEditingLayout && isMarqueeMode && selectedTableIds.size >= 2 && (
              <button
                onClick={handleMergeSelectedGroup}
                className="flex items-center gap-2 px-6 py-4 bg-amber-500 border-amber-600 text-white rounded-2xl text-sm font-black hover:bg-amber-600 transition-all shadow-md active:scale-95 animate-pulse"
              >
                <ArrowRightLeft className="w-5 h-5" /> UNIR MESAS SELECCIONADAS ({selectedTableIds.size})
              </button>
            )}
          </div>

          {!isEditingLayout && (
            <div className="flex gap-3">
              {floorPlans.find(p => p.isDefault) && (
                <button
                  onClick={() => {
                    const defaultPlan = floorPlans.find(p => p.isDefault);
                    if (defaultPlan) loadFloorPlan(defaultPlan.id);
                  }}
                  className="flex items-center gap-3 px-6 py-4 bg-amber-50 rounded-2xl text-sm font-black text-amber-600 hover:bg-amber-100 transition-all shadow-sm border border-amber-100 active:scale-95"
                >
                  <Star className="w-5 h-5 fill-amber-500" /> RESTAURAR PREDETERMINADO
                </button>
              )}
              <button
                onClick={() => setIsEditingLayout(true)}
                className="flex items-center gap-3 px-8 py-4 bg-slate-900 rounded-2xl text-sm font-black text-white hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
              >
                <Layout className="w-5 h-5 text-indigo-400" /> EDITAR PLANO
              </button>
            </div>
          )}
        </div>

        {isMarqueeMode && isEditingLayout && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-2.5 rounded-full shadow-lg text-xs font-black uppercase tracking-wider z-40 border border-white/20 animate-bounce">
            Modo Selección Múltiple Activo · Arrastra en zona vacía para agrupar
          </div>
        )}

        {isMergeMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-2.5 rounded-full shadow-lg text-xs font-black uppercase tracking-wider z-40 border border-white/20 animate-pulse">
            {!mergeSourceId 
              ? "Selecciona la MESA ORIGEN (que tiene el pedido) haciendo clic sobre ella" 
              : `Mesa Origen: ${mergeSourceId} · Ahora selecciona la MESA DESTINO`
            }
          </div>
        )}

        <div
          ref={canvasRef}
          className={cn(
            "flex-1 w-full bg-slate-50/50 rounded-[3.5rem] border border-slate-200/80 relative overflow-hidden shadow-inner shadow-slate-900/5",
            isEditingLayout ? "ring-[12px] ring-indigo-50 border-indigo-100" : "",
            isPanning ? "cursor-move" : !isEditingLayout ? "cursor-default" : "cursor-default"
          )}
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}
          onMouseDown={onCanvasMouseDown}
          onClick={() => isEditingLayout && setSelectedTableIds(new Set())}
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
            {tables
              .filter(table => isEditingLayout || waiterFilter === 'Todos' || table.waiterName === waiterFilter || table.type === 'wall')
              .map(table => renderTable(table))}

            {/* Caja del Marquee translúcida */}
            {selectionBox && (
              <div
                className="bg-indigo-600/15 border-2 border-dashed border-indigo-500 pointer-events-none absolute z-50 rounded"
                style={{
                  left: Math.min(selectionBox.x1, selectionBox.x2),
                  top: Math.min(selectionBox.y1, selectionBox.y2),
                  width: Math.abs(selectionBox.x2 - selectionBox.x1),
                  height: Math.abs(selectionBox.y2 - selectionBox.y1),
                }}
              />
            )}

            {/* Tarjeta Flotante (Hover Card) */}
            {(() => {
              const hoveredTable = tables.find(t => t.id === hoveredTableId);
              if (!hoveredTable || hoveredTable.type === 'wall') return null;
              
              const totalItemsPrice = hoveredTable.order.reduce((acc, i) => acc + (i.price * i.qty), 0);
              
              return (
                <div 
                  className="absolute bg-slate-950/90 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-slate-700/50 w-64 z-50 transition-all duration-200 pointer-events-auto flex flex-col gap-2 font-sans text-left"
                  style={{
                    left: hoveredTable.x + hoveredTable.width / 2,
                    top: hoveredTable.y - 12,
                    transform: 'translate(-50%, -100%)',
                  }}
                  onMouseEnter={() => setHoveredTableId(hoveredTable.id)}
                  onMouseLeave={() => setHoveredTableId(null)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs tracking-wider">MESA {hoveredTable.id}</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                        hoveredTable.status === 'available' ? "bg-emerald-500/20 text-emerald-400" :
                        hoveredTable.status === 'dirty' ? "bg-slate-500/20 text-slate-400" :
                        hoveredTable.status === 'waiting_food' ? "bg-amber-500/20 text-amber-400 animate-pulse" :
                        hoveredTable.status === 'checkout' ? "bg-rose-500/20 text-rose-400 animate-pulse" :
                        "bg-indigo-500/20 text-indigo-400"
                      )}>
                        {hoveredTable.status === 'available' ? "Libre" :
                         hoveredTable.status === 'dirty' ? "Sucia" :
                         hoveredTable.status === 'waiting_food' ? "Espera Cocina" :
                         hoveredTable.status === 'checkout' ? "Por Cobrar" : "Ocupada"}
                      </span>
                    </div>
                    {hoveredTable.waiterName && (
                      <span className="text-[9px] bg-white/15 px-2 py-0.5 rounded-full font-bold">
                        {hoveredTable.waiterName}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="text-[11px] text-slate-300 space-y-1">
                    {hoveredTable.status !== 'available' && hoveredTable.lastUpdate && (
                      <div className="flex justify-between">
                        <span>Tiempo activo:</span>
                        <span className="font-bold text-white">
                          {Math.floor((Date.now() - new Date(hoveredTable.lastUpdate).getTime()) / 60000)} minutos
                        </span>
                      </div>
                    )}
                    {hoveredTable.status !== 'available' && hoveredTable.status !== 'dirty' && (
                      <>
                        <div className="flex justify-between">
                          <span>Consumo actual:</span>
                          <span className="font-black text-amber-400 text-xs">
                            ${totalItemsPrice}
                          </span>
                        </div>
                        <div className="border-t border-white/5 my-2 pt-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Items comandados</span>
                          {hoveredTable.order.length === 0 ? (
                            <span className="italic text-slate-500 block">Sin ítems aún</span>
                          ) : (
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {hoveredTable.order.slice(0, 3).map(i => (
                                <div key={i.id} className="flex justify-between text-slate-400">
                                  <span className="truncate max-w-[130px] font-medium">{i.name}</span>
                                  <span className="font-bold text-white">x{i.qty}</span>
                                </div>
                              ))}
                              {hoveredTable.order.length > 3 && (
                                <div className="text-[9px] text-slate-500 italic font-semibold">
                                  + {hoveredTable.order.length - 3} más...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick actions */}
                  {hoveredTable.status === 'dirty' && (
                    <button 
                      onClick={(e) => handleCleanTable(hoveredTable.id, e)}
                      className="w-full mt-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-[9px] font-black tracking-widest uppercase transition-all shadow-md"
                    >
                      🧹 Limpiar y Habilitar
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-20 bg-slate-900/10 backdrop-blur-md p-1.5 rounded-3xl border border-slate-200/50 shadow-xl">
            <button onClick={() => adjustZoom(1.2)} className="w-12 h-12 bg-white shadow border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 transition-all active:scale-95" title="Acercar">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={() => adjustZoom(1 / 1.2)} className="w-12 h-12 bg-white shadow border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 transition-all active:scale-95" title="Alejar">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={fitAll} title="Ajustar todo" className="w-12 h-12 bg-white shadow border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 transition-all active:scale-95">
              <Maximize2 className="w-5 h-5" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-12 h-12 bg-white shadow border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 transition-all active:scale-95 text-xs font-black" title="Restaurar zoom 1:1">
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
                <div className="flex items-center gap-4">
                  <h3 className="font-black text-3xl text-slate-900">Mesa {selectedTableId}</h3>
                  <button
                    onClick={() => setQrModalTableId(selectedTableId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black transition-all"
                  >
                    <Smartphone className="w-4 h-4" /> QR Mesa
                  </button>
                </div>
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
      {/* Visual Table Merge Confirmation Modal */}
      {isMergeMode && mergeSourceId && mergeTargetId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-indigo-600">
              <ArrowRightLeft className="w-8 h-8" />
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">Confirmar Unión</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              ¿Deseas transferir los pedidos y consumos de la mesa <span className="font-black text-indigo-600">{mergeSourceId}</span> a la mesa <span className="font-black text-indigo-600">{mergeTargetId}</span>?
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setMergeSourceId(null);
                  setMergeTargetId(null);
                  setIsMergeMode(false);
                }}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await handleMergeTables(mergeTargetId);
                  setMergeSourceId(null);
                  setMergeTargetId(null);
                  setIsMergeMode(false);
                }}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-100"
              >
                Confirmar
              </button>
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

      {qrModalTableId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6" onClick={() => setQrModalTableId(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h4 className="font-black text-xl text-slate-900">Código QR - Mesa {qrModalTableId}</h4>
              <button onClick={() => setQrModalTableId(null)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl flex justify-center border border-slate-100 shadow-inner">
              {qrUrl ? (
                <img src={qrUrl} alt={`QR Mesa ${qrModalTableId}`} className="w-64 h-64 mix-blend-multiply" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-sm">Generando...</div>
              )}
            </div>
            
            <p className="text-xs text-slate-500 font-medium">
              Enlace: <span className="font-mono text-[10px] break-all">{`${window.location.origin}/#/cliente/${qrModalTableId}`}</span>
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrUrl;
                  link.download = `QR_Mesa_${qrModalTableId}.png`;
                  link.click();
                }}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition-all"
              >
                Descargar
              </button>
              <button 
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>QR Mesa ${qrModalTableId}</title>
                          <style>
                            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0; }
                            img { width: 300px; height: 300px; }
                            h1 { margin-top: 20px; font-size: 24px; color: #1e293b; }
                            p { font-size: 14px; color: #64748b; margin-top: 5px; }
                          </style>
                        </head>
                        <body>
                          <img src="${qrUrl}" />
                          <h1>MESA ${qrModalTableId}</h1>
                          <p>Escanea para ver la carta y pedir</p>
                          <script>
                            window.onload = function() {
                              window.print();
                              setTimeout(() => window.close(), 500);
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
                className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
