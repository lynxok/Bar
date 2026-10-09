import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLiveQuery } from 'dexie-react-hooks';
import { timeLabel, upcomingForTable } from '../lib/reservations';
import { PaymentModal } from './tablemap/PaymentModal';
import type { OrderItem } from '../contexts/StoreContext';
import { computeTotals, taxLabel } from '../lib/pricing';
import { TableTile } from './tablemap/TableTile';
import { OrderPanel } from './tablemap/OrderPanel';
import { FloorEditorToolbar } from './tablemap/FloorEditorToolbar';
import { TableQrModal } from './tablemap/TableQrModal';
import { 
  X, Plus, Minus, Save, Trash2, Layout, Users, RotateCw,
  ZoomIn, ZoomOut, Maximize2, Wallet, CreditCard, ArrowRightLeft,
  User, ArrowRight, ChefHat, Smartphone, Star, ChevronDown
} from "lucide-react";
import { cn } from "../lib/utils";
import { useStore, Table } from "../contexts/StoreContext";
import { useBusiness } from "../contexts/BusinessContext";
import { useToast } from "../components/ui/Toast";
import { db } from "../db/database";


const isRotatable = (type: Table['type']) => type !== 'round' && type !== 'stool';

export function TableMap() {
  const { tables, products, updateTableOrder, closeOrder, moveTable, addTable, removeTable, updateTable, addComanda, floorPlans, saveFloorPlan, loadFloorPlan, deleteFloorPlan, setDefaultFloorPlan, clientOrders, approveClientOrder, rejectClientOrder, comandas } = useStore();
  const { taxRate, pricesIncludeTax } = useBusiness();
  const { showToast, confirm } = useToast();

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isMobileOrdersOpen, setIsMobileOrdersOpen] = useState(false);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [expandedMobileTables, setExpandedMobileTables] = useState<Record<string, boolean>>({});

  const lastPendingCountRef = useRef(0);
  useEffect(() => {
    const pendingOrders = clientOrders?.filter(o => o.status === 'pending') || [];
    if (pendingOrders.length > lastPendingCountRef.current) {
      setIsMobileOrdersOpen(true);
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.5;
        audio.play();
      } catch (e) {
        console.log("Audio play failed: ", e);
      }
    }
    lastPendingCountRef.current = pendingOrders.length;
  }, [clientOrders]);

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
        if (await confirm({ title: "Eliminar mesas", message: `¿Deseas eliminar las ${selectedTableIds.size} mesas seleccionadas?`, isDestructive: true })) {
          const idsArray = Array.from(selectedTableIds);
          try {
            await Promise.all(idsArray.map(id => db.salonTables.delete(id)));
            setSelectedTableIds(new Set());
          } catch (err) {
            console.error(err);
            showToast("Error al eliminar mesas en lote.", "error");
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
      showToast("Error al fusionar las mesas.", "error");
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

    const okUnir = await confirm({ title: "Unir mesas", message: `¿Unir las ${ids.length} mesas seleccionadas en la mesa ${targetId}?` }); if (!okUnir) return;

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
      showToast(`Unión grupal completada en la mesa ${targetId}.`, "success");
      setSelectedTableIds(new Set());
    } catch (err) {
      console.error(err);
      showToast("Error al fusionar el grupo de mesas.", "error");
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
    const newZoom = Math.min(1.1, Math.max(0.3,
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

  // Carta real (productos activos del inventario), con id estable para descontar stock
  // Reservas activas para marcar mesas reservadas en las próximas 2 horas
  const reservations = useLiveQuery(() => db.reservations.where('status').anyOf('pending', 'confirmed').toArray(), []) || [];
  const [menuSearch, setMenuSearch] = useState('');
  const menuItems = products
    .filter(p => p.status !== 'inactive' && p.id != null)
    .filter(p => !menuSearch || p.name.toLowerCase().includes(menuSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(menuSearch.toLowerCase()))
    .map(p => ({ id: String(p.id), productId: p.id as number, name: p.name, price: p.price, category: p.category }));

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
  const { tax: taxes, total } = computeTotals(subtotal, { taxRate, pricesIncludeTax });

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
      showToast("Error al crear el elemento.", "error");
    }
  };

  const STATUS_CLASSES: Record<Table['status'], string> = {
    available: "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-600/20 text-white shadow-emerald-100/50 shadow-md",
    occupied_no_order: "bg-gradient-to-br from-sky-400 to-sky-600 border-sky-600/20 text-white shadow-sky-100/50 shadow-md",
    waiting_food: "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-600/20 text-white shadow-amber-100/50 shadow-md",
    consuming: "bg-gradient-to-br from-[#0F6B41] to-[#1E4437] border-[#0F6B41]/30 text-white shadow-[#0F6B41]/20 shadow-md",
    checkout: "bg-gradient-to-br from-rose-500 to-pink-600 border-rose-600/20 text-white shadow-rose-100/50 shadow-md animate-pulse",
    dirty: "bg-gradient-to-br from-slate-400 to-slate-500 border-slate-500/20 text-white shadow-slate-100/50 shadow-md",
    occupied: "bg-gradient-to-br from-rose-500 to-pink-600 border-rose-600/20 text-white shadow-rose-100/50 shadow-md animate-pulse",
  };

  const ChairCircle = ({ cx, cy, status }: { cx: number, cy: number, status: string, key?: string | number }) => {
    const dotColors: Record<string, string> = {
      available: "bg-emerald-500",
      occupied_no_order: "bg-sky-500",
      waiting_food: "bg-amber-500",
      consuming: "bg-[#0F6B41]",
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
    const isSelected = selectedTableIds.has(table.id) && (isEditingLayout || isMarqueeMode);
    const res = upcomingForTable(table.id, reservations);

    return (
      <TableTile
        key={table.id}
        table={table}
        isSelected={isSelected}
        isDragging={isDragging}
        isRotating={isRotating}
        isEditingLayout={isEditingLayout}
        dragPos={dragPos}
        liveRotation={liveRotation}
        reservation={res ? { customerName: res.customerName, partySize: res.partySize, date: res.date } : null}
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
                    showToast("Debes seleccionar una mesa ocupada como origen.", "warning");
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
        onRotateHandleMouseDown={(e) => onRotateHandleMouseDown(e, table)}
        onResizePointerDown={(e) => handleResizeStart(e, table)}
        onResizePointerMove={(e) => handleResizeMove(e, table)}
        onResizePointerUp={(e) => handleResizeEnd(e, table)}
      />
    );
  };

  return (
    <div
      className="h-[calc(100vh-64px)] flex relative overflow-hidden bg-slate-100 dark:bg-[#121E19] select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {isEditingLayout && (
        <FloorEditorToolbar
          editingTable={editingTable}
          floorPlans={floorPlans}
          showSavedPlans={showSavedPlans}
          newLayoutName={newLayoutName}
          onSetNewLayoutName={setNewLayoutName}
          onToggleSavedPlans={() => setShowSavedPlans(!showSavedPlans)}
          onSaveFloorPlan={(name) => {
            if (!name) { showToast("Ingresá un nombre para la configuración", "warning"); return; }
            saveFloorPlan(name);
            setNewLayoutName('');
            showToast("Configuración guardada correctamente", "success");
          }}
          onLoadFloorPlan={loadFloorPlan}
          onDeleteFloorPlan={(id) => {
            confirm({ title: "Eliminar plantilla", message: "¿Eliminar esta plantilla?", isDestructive: true }).then(ok => { if (ok) deleteFloorPlan(id); });
          }}
          onSetDefaultFloorPlan={setDefaultFloorPlan}
          onClose={() => {
            setIsEditingLayout(false);
            setSelectedTableIds(new Set());
          }}
          onCreateNew={handleCreateNew}
          onUpdateTable={updateTable}
          onDeleteSelected={async () => {
            if (editingTable && await confirm({ title: "Eliminar elemento", message: "¿Eliminar elemento?", isDestructive: true })) {
              removeTable(editingTable.id);
              setSelectedTableIds(new Set());
            }
          }}
          onOpenQrModal={(id) => setQrModalTableId(id)}
          adjustChair={adjustChair}
        />
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
              <h2 className="font-black text-4xl text-slate-900 dark:text-zinc-100 tracking-tight">Sala</h2>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold bg-white dark:bg-[#182C24] text-slate-500 dark:text-zinc-400 px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
                  <Users className="w-4 h-4 text-[#0F6B41]" />
                  {tables.filter(t => t.type !== 'wall').reduce((acc, t) => acc + (t.capacity || 0), 0)} PLAZAS TOTALES
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-[#14261F] text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full shadow-sm border border-emerald-100 dark:border-emerald-900/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {tables.filter(t => t.status === 'available' && t.type !== 'wall').length} MESAS LIBRES
                </div>
                
                <div className="h-5 w-[1px] bg-slate-200 hidden lg:block" />
                <div className="hidden lg:flex items-center gap-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#182C24] px-4 py-2 rounded-xl shadow-xs border border-slate-200 dark:border-white/10 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-[#0F6B41] bg-white" /> Disponible
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-100 border border-emerald-400" /> Sin pedido
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Cocina
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F6B41]" /> Consumiendo
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FA4515] animate-pulse" /> Por cobrar
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/30" /> Sucia
                  </div>
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
                      showToast("No hay mesas ocupadas para iniciar una unión.", "warning");
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
                    : "bg-[#0F6B41]/10 dark:bg-[#0F6B41]/30 border-[#0F6B41]/20 dark:border-emerald-500/30 text-[#0F6B41] dark:text-emerald-400 hover:bg-[#0F6B41]/20 dark:hover:bg-[#0F6B41]/40"
                )}
              >
                {isMergeMode ? 'Cancelar unión' : 'Unir mesas'}
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
                      ? "bg-[#0F6B41] border-[#0F6B41] text-white shadow-sm" 
                      : "bg-white dark:bg-[#182C24] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-[#1E342B]"
                  )}
                >
                  <Layout className="w-5 h-5 text-[#0F6B41]" /> SELECCIÓN MÚLTIPLE: {isMarqueeMode ? 'ON' : 'OFF'}
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
              {(() => {
                const pendingOrders = clientOrders?.filter(o => o.status === 'pending') || [];
                return (
                  <button
                    onClick={() => setIsMobileOrdersOpen(true)}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black transition-all shadow-sm border active:scale-95 relative",
                      pendingOrders.length > 0
                        ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Smartphone className="w-5 h-5 text-[#0F6B41]" /> PEDIDOS QR
                    {pendingOrders.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-bounce shadow-md">
                        {pendingOrders.length}
                      </span>
                    )}
                  </button>
                );
              })()}
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
                className="flex items-center gap-3 px-8 py-4 bg-[#1E4437] rounded-2xl text-sm font-black text-white hover:bg-[#0C5734] transition-all shadow-xl active:scale-95"
              >
                <Layout className="w-5 h-5 text-[#0F6B41]" /> EDITAR PLANO
              </button>
            </div>
          )}
        </div>

        {isMarqueeMode && isEditingLayout && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0F6B41] text-white px-6 py-2.5 rounded-full shadow-lg text-xs font-black uppercase tracking-wider z-40 border border-white/20 animate-bounce">
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
            "hidden md:block flex-1 w-full bg-slate-50/50 dark:bg-[#14261F]/60 rounded-[3.5rem] border border-slate-200/80 dark:border-slate-800 relative overflow-hidden shadow-inner shadow-slate-900/5",
            isEditingLayout ? "ring-[12px] ring-[#0F6B41]/10 border-[#0F6B41]/20" : "",
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
                className="bg-[#0F6B41]/15 border-2 border-dashed border-[#0F6B41] pointer-events-none absolute z-50 rounded"
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
              
              // Get active kitchen items status
              const activeComandas = comandas?.filter(c => c.tableId === hoveredTable.id) || [];
              const pendingItems = new Set(
                activeComandas
                  .filter(c => c.status === 'pending' || c.status === 'cooking')
                  .flatMap(c => c.items.map(i => i.name))
              );
              const readyItems = new Set(
                activeComandas
                  .filter(c => c.status === 'ready')
                  .flatMap(c => c.items.map(i => i.name))
              );

              return (
                <div 
                  className="absolute bg-slate-950/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-slate-700/50 w-72 z-50 transition-all duration-200 pointer-events-auto flex flex-col gap-2.5 font-sans text-left"
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
                        "bg-[#0F6B41]/20 text-[#0F6B41]"
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

                  {/* Checkout notification banner */}
                  {hoveredTable.status === 'checkout' && (
                    <div className="bg-rose-600/30 border border-rose-500/50 rounded-xl py-2 px-3 text-center text-rose-350 text-[10px] font-black tracking-wider animate-pulse flex items-center justify-center gap-1.5 shrink-0">
                      🔔 ¡CLIENTE SOLICITÓ LA CUENTA!
                    </div>
                  )}

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
                            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                              {hoveredTable.order.map((i, idx) => {
                                let stateLabel = "🍽 Servido";
                                let stateColor = "text-slate-450";
                                if (readyItems.has(i.name)) {
                                  stateLabel = "🔔 ¡Listo!";
                                  stateColor = "text-emerald-450 font-black animate-pulse";
                                } else if (pendingItems.has(i.name)) {
                                  stateLabel = "🍳 Cocinando";
                                  stateColor = "text-amber-405 font-bold";
                                }
                                return (
                                  <div key={i.id || idx} className="flex justify-between text-slate-400 items-center">
                                    <span className="truncate max-w-[120px] font-medium">{i.name}</span>
                                    <div className="flex gap-2 items-center">
                                      <span className="font-bold text-white">x{i.qty}</span>
                                      <span className={cn("text-[8px] uppercase px-1 rounded bg-white/5 font-semibold", stateColor)}>
                                        {stateLabel}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
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
            <button onClick={() => adjustZoom(1.2)} className="w-12 h-12 bg-white dark:bg-[#182C24] shadow border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center hover:bg-[#0F6B41]/10 hover:border-[#0F6B41]/40 text-slate-700 dark:text-zinc-200 hover:text-[#0F6B41] transition-all active:scale-95" title="Acercar">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={() => adjustZoom(1 / 1.2)} className="w-12 h-12 bg-white dark:bg-[#182C24] shadow border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center hover:bg-[#0F6B41]/10 hover:border-[#0F6B41]/40 text-slate-700 dark:text-zinc-200 hover:text-[#0F6B41] transition-all active:scale-95" title="Alejar">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={fitAll} title="Ajustar todo" className="w-12 h-12 bg-white dark:bg-[#182C24] shadow border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center hover:bg-[#0F6B41]/10 hover:border-[#0F6B41]/40 text-slate-700 dark:text-zinc-200 hover:text-[#0F6B41] transition-all active:scale-95">
              <Maximize2 className="w-5 h-5" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-12 h-12 bg-white dark:bg-[#182C24] shadow border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center hover:bg-[#0F6B41]/10 hover:border-[#0F6B41]/40 text-slate-700 dark:text-zinc-200 hover:text-[#0F6B41] transition-all active:scale-95 text-xs font-black" title="Restaurar zoom 1:1">
              1:1
            </button>
          </div>

          {/* Zoom indicator only */}
          <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl px-3 py-1.5 text-[11px] font-black text-slate-500 shadow pointer-events-none z-20">
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Vista de Lista Optimizada para Móviles */}
        <div className="md:hidden flex-1 overflow-y-auto w-full space-y-6 pr-1 mt-4">
          {tables
            .filter(table => table.type !== 'wall' && (waiterFilter === 'Todos' || table.waiterName === waiterFilter))
            .map((table) => {
              const isExpanded = !!expandedMobileTables[table.id];
              const totalItemsPrice = table.order.reduce((acc, i) => acc + (i.price * i.qty), 0);
              const elapsedMinutes = table.lastUpdate ? Math.floor((Date.now() - new Date(table.lastUpdate).getTime()) / 60000) : null;
              
              // Get active kitchen items status
              const activeComandas = comandas?.filter(c => c.tableId === table.id) || [];
              const pendingItems = new Set(
                activeComandas
                  .filter(c => c.status === 'pending' || c.status === 'cooking')
                  .flatMap(c => c.items.map(i => i.name))
              );
              const readyItems = new Set(
                activeComandas
                  .filter(c => c.status === 'ready')
                  .flatMap(c => c.items.map(i => i.name))
              );

              // Map status labels & styles
              const statusLabels: Record<Table['status'], string> = {
                available: "Disponible",
                occupied: "Ocupada",
                occupied_no_order: "Ocupada (Sin Pedido)",
                waiting_food: "Espera Cocina",
                consuming: "Consumiendo",
                checkout: "Por Cobrar",
                dirty: "Sucia"
              };

              const statusColors: Record<Table['status'], string> = {
                available: "bg-emerald-100 text-emerald-800 border-emerald-250",
                occupied: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse",
                occupied_no_order: "bg-sky-100 text-sky-800 border-sky-200",
                waiting_food: "bg-amber-100 text-amber-800 border-amber-250 animate-pulse",
                consuming: "bg-[#0F6B41]/15 text-[#0F6B41] border-[#0F6B41]/30",
                checkout: "bg-red-100 text-red-800 border-red-250 animate-pulse",
                dirty: "bg-slate-100 text-slate-800 border-slate-200"
              };

              return (
                <div 
                  key={table.id} 
                  className={cn(
                    "bg-white rounded-[2rem] border-2 border-slate-200 shadow-md overflow-hidden transition-all duration-200",
                    table.status === 'checkout' ? "ring-2 ring-red-500/25 border-red-400" : ""
                  )}
                >
                  {/* Card Header Row */}
                  <div 
                    onClick={() => setExpandedMobileTables(prev => ({ ...prev, [table.id]: !prev[table.id] }))}
                    className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-50 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black text-sm shadow-inner text-white",
                        table.status === 'available' ? "bg-gradient-to-br from-emerald-400 to-emerald-600" :
                        table.status === 'dirty' ? "bg-gradient-to-br from-slate-400 to-slate-500" :
                        table.status === 'checkout' ? "bg-gradient-to-br from-rose-500 to-pink-600 animate-pulse" :
                        table.status === 'waiting_food' ? "bg-gradient-to-br from-amber-400 to-orange-500 animate-pulse" :
                        "bg-gradient-to-br from-[#0F6B41] to-[#1E4437]"
                      )}>
                        <span>{table.id}</span>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-sm">Mesa {table.id.split('-')[1] || table.id}</h4>
                        <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1 inline-block", statusColors[table.status])}>
                          {statusLabels[table.status]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {table.status !== 'available' && table.status !== 'dirty' && (
                          <div className="font-black text-amber-500 text-sm">${totalItemsPrice}</div>
                        )}
                        {table.waiterName && (
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{table.waiterName}</div>
                        )}
                      </div>
                      <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-200", isExpanded ? "rotate-180 text-[#0F6B41]" : "")} />
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/40 space-y-4">
                      {/* Active Time */}
                      {table.status !== 'available' && elapsedMinutes !== null && (
                        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                          <span>Tiempo activa:</span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">⏱ {elapsedMinutes} min</span>
                        </div>
                      )}

                      {/* Items details list */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Productos Comandados</span>
                        {table.order.length === 0 ? (
                          <span className="text-xs text-slate-400 italic block">Sin ítems aún</span>
                        ) : (
                          <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-150 p-3 space-y-2">
                            {table.order.map((item, idx) => {
                              let stateLabel = "🍽 Servido";
                              let stateColor = "text-slate-400";
                              if (readyItems.has(item.name)) {
                                stateLabel = "🔔 Listo";
                                stateColor = "text-emerald-500 font-black animate-pulse";
                              } else if (pendingItems.has(item.name)) {
                                stateLabel = "🍳 Cocina";
                                stateColor = "text-amber-500 font-semibold";
                              }
                              return (
                                <div key={idx} className="flex justify-between items-center text-xs text-slate-655 pt-2 first:pt-0">
                                  <span className="font-semibold">{item.name}</span>
                                  <div className="flex gap-2.5 items-center">
                                    <span className="font-black text-slate-800">x{item.qty}</span>
                                    <span className={cn("text-[9px] font-bold uppercase bg-slate-50 px-1.5 py-0.5 rounded", stateColor)}>
                                      {stateLabel}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Control actions inside card */}
                      <div className="flex gap-2.5 pt-2">
                        {table.status === 'dirty' && (
                          <button 
                            onClick={(e) => handleCleanTable(table.id, e)}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            🧹 Habilitar
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedTableId(table.id)}
                          className="flex-1 py-3 bg-[#0F6B41] hover:bg-[#0D5A37] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          🍳 Comandar / Cobrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Order Panel Modal */}
      {selectedTableId && (
        <OrderPanel
          tableId={selectedTableId}
          orderItems={orderItems}
          menuItems={menuItems}
          total={total}
          onClose={() => setSelectedTableId(null)}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onSendToKitchen={() => {
            addComanda(selectedTableId!, orderItems);
            setSelectedTableId(null);
          }}
          onOpenPayment={() => setIsPaymentModalOpen(true)}
          onOpenQr={() => setQrModalTableId(selectedTableId)}
        />
      )}
      {/* Visual Table Merge Confirmation Modal */}
      {isMergeMode && mergeSourceId && mergeTargetId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-[#0F6B41]">
              <ArrowRightLeft className="w-8 h-8" />
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">Confirmar Unión</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              ¿Deseas transferir los pedidos y consumos de la mesa <span className="font-black text-[#0F6B41]">{mergeSourceId}</span> a la mesa <span className="font-black text-[#0F6B41]">{mergeTargetId}</span>?
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
                className="flex-1 py-3.5 bg-[#0F6B41] hover:bg-[#0D5A37] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/10"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cobro (una cuenta o dividida, con propina y QR de Mercado Pago) */}
      {isPaymentModalOpen && selectedTableId && (
        <PaymentModal
          tableId={selectedTableId}
          items={orderItems as OrderItem[]}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaid={() => {
            setIsPaymentModalOpen(false);
            setSelectedTableId(null);
            setLoyaltyId('');
            setPaymentMethod('Efectivo');
          }}
        />
      )}

      {qrModalTableId && (
        <TableQrModal tableId={qrModalTableId} onClose={() => setQrModalTableId(null)} />
      )}
      {isMobileOrdersOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#0F6B41]" /> Pedidos Móviles (Clientes)
                </h2>
                <p className="text-sm text-slate-500 font-medium">Pedidos realizados por clientes escaneando el código QR.</p>
              </div>
              <button 
                onClick={() => setIsMobileOrdersOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(!clientOrders || clientOrders.filter(co => co.status === 'pending').length === 0) ? (
                <div className="text-center py-12 text-slate-400">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-slate-600">No hay pedidos pendientes</p>
                  <p className="text-xs text-slate-400 mt-1">Los pedidos de los clientes aparecerán aquí automáticamente.</p>
                </div>
              ) : (
                clientOrders.filter(co => co.status === 'pending').map((order) => {
                  const minutesAgo = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
                  return (
                    <div key={order.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-[#0F6B41] text-white font-black px-3 py-1 rounded-lg text-sm">
                            Mesa {order.tableId.replace('T-', '')}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            Hace {minutesAgo} min ({new Date(order.timestamp).toLocaleTimeString()})
                          </span>
                        </div>
                        <span className="font-black text-slate-800">${order.total.toLocaleString()}</span>
                      </div>

                      <div className="bg-white rounded-lg border border-slate-150 p-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Ítems</span>
                        <div className="divide-y divide-slate-100">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between py-1.5 text-sm text-slate-700">
                              <span>{item.name}</span>
                              <span className="font-bold">x{item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-1">
                        <button
                          onClick={async () => {
                            if (await confirm({ title: "Rechazar pedido", message: "¿Rechazar este pedido del cliente?", isDestructive: true })) {
                              await rejectClientOrder(order.id!);
                            }
                          }}
                          className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={async () => {
                            await approveClientOrder(order.id!);
                          }}
                          className="px-4 py-2 bg-[#0F6B41] text-white font-bold text-xs rounded-xl hover:bg-[#0D5A37] shadow-md shadow-emerald-900/10 transition-colors"
                        >
                          Aprobar y Mandar a Cocina
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button 
                onClick={() => setIsMobileOrdersOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
