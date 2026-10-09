import React, { useState, useEffect, useRef } from 'react';

import { logout } from '../lib/auth';
import { SyncStatusBadge } from '../components/SyncStatusBadge';
import { computeTotals } from '../lib/pricing';
import { mpIsConfigured } from '../lib/mercadopago';
import { printTicket } from '../lib/printing';
import { MercadoPagoQr } from '../components/payments/MercadoPagoQr';
import { useStore, OrderItem, type Table } from '../contexts/StoreContext';
import { formatMoney } from '../lib/format';

import { 
  LogOut, 
  ArrowLeft, 
  Plus, 
  Minus, 
  Search, 
  Smartphone, 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  QrCode, 
  Check, 
  Wallet, 
  ShoppingBag,
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Html5Qrcode } from 'html5-qrcode';

export function WaiterMobile() {
  const { 
    tables, 
    products, 
    addComanda, 
    updateTableOrder, 
    closeOrder, 
    updateTable,
    comandas, 
    clientOrders 
  } = useStore();

  // Navigation tabs: 'tables' | 'menu' | 'scan'
  const [activeTab, setActiveTab] = useState<'tables' | 'menu' | 'scan'>('tables');
  
  // Table search and filters
  const [tableSearch, setTableSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  // QR Scanning Simulation State
  const [scannedTableId, setScannedTableId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // Active ordering table (when adding products to a table)
  const [orderingTableId, setOrderingTableId] = useState<string | null>(null);
  const [comandaItems, setComandaItems] = useState<{ id: string; name: string; price: number; qty: number; note: string }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Checkout (Payment) modal state
  const [checkoutTableId, setCheckoutTableId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'qr'>('cash');
  const [dniInput, setDniInput] = useState('');
  const [discountInput, setDiscountInput] = useState('0');
  const [tipInput, setTipInput] = useState('');
  const [mpEnabled, setMpEnabled] = useState(false);
  const [showMpQr, setShowMpQr] = useState(false);
  useEffect(() => { mpIsConfigured().then(setMpEnabled); }, []);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Camera QR scanner states & controls
  const [scanningError, setScanningError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrReaderId = "mobile-qr-reader";

  useEffect(() => {
    if (activeTab !== 'scan') {
      stopScanning();
    }
  }, [activeTab]);

  const startScanning = async () => {
    setScanningError(null);
    setIsScanning(true);
    setScannedTableId(null);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(qrReaderId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (qrMessage) => {
            let tableId = qrMessage.trim();
            if (tableId.includes('/mesa/')) {
              tableId = tableId.split('/mesa/')[1];
            } else if (tableId.includes('/')) {
              const parts = tableId.split('/');
              tableId = parts[parts.length - 1];
            }
            
            let formatted = tableId.toUpperCase();
            if (!formatted.startsWith('T-')) {
              formatted = `T-${formatted}`;
            }

            const found = tables.find(t => t.id === formatted && t.type !== 'wall');
            if (found) {
              setScannedTableId(found.id);
              triggerToast(`Mesa ${found.id.replace('T-', '')} escaneada con éxito.`);
              stopScanning();
            } else {
              triggerToast(`Mesa "${tableId}" no registrada en el salón.`, 'error');
            }
          },
          () => {} // Ignored
        );
      } catch (err) {
        console.error("Camera access failed", err);
        setScanningError("Error al iniciar cámara. Concede permisos e intenta de nuevo.");
        setIsScanning(false);
      }
    }, 150);
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (e) {
        console.error(e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(e => console.error(e));
      }
    };
  }, []);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Toast logic for incoming QR orders
  const lastPendingCountRef = useRef(0);
  useEffect(() => {
    const pendingOrders = clientOrders?.filter(o => o.status === 'pending') || [];
    if (pendingOrders.length > lastPendingCountRef.current) {
      triggerToast('¡Nuevo pedido QR recibido!', 'success');
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.5;
        audio.play();
      } catch (e) {}
    }
    lastPendingCountRef.current = pendingOrders.length;
  }, [clientOrders]);

  const handleLogout = () => {
    void logout().finally(() => window.location.reload());
  };

  const handleCleanTable = async (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateTable(tableId, { status: 'available', waiterName: '', order: [] });
      triggerToast(`Mesa ${tableId.replace('T-', '')} habilitada y limpia.`);
    } catch {
      triggerToast('Error al habilitar la mesa', 'error');
    }
  };

  const handleSolicitarCuenta = async (tableId: string) => {
    try {
      await updateTable(tableId, { status: 'checkout' });
      triggerToast(`Mesa ${tableId.replace('T-', '')}: cuenta solicitada.`);
      if (scannedTableId === tableId) {
        setScannedTableId(tableId); // force refresh view
      }
    } catch {
      triggerToast('Error al solicitar la cuenta', 'error');
    }
  };

  // Cart operations
  const handleAddProduct = (product: typeof products[0]) => {
    setComandaItems(prev => {
      const existing = prev.find(item => item.name === product.name);
      if (existing) {
        return prev.map(item => item.name === product.name ? { ...item, qty: item.qty + 1 } : item);
      } else {
        return [...prev, {
          id: product.id?.toString() || `prod-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
          note: ''
        }];
      }
    });
  };

  const handleUpdateQty = (name: string, delta: number) => {
    setComandaItems(prev => prev.map(item => {
      if (item.name === name) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean) as typeof comandaItems);
  };

  const handleUpdateNote = (name: string, note: string) => {
    setComandaItems(prev => prev.map(item => item.name === name ? { ...item, note } : item));
  };

  const handleSendComanda = async () => {
    if (!orderingTableId || comandaItems.length === 0) return;
    try {
      const comandaPayload = comandaItems.map(item => ({
        name: item.note ? `${item.name} (${item.note})` : item.name,
        price: item.price,
        qty: item.qty
      }));
      await addComanda(orderingTableId, comandaPayload);

      const table = tables.find(t => t.id === orderingTableId);
      const currentOrderItems: OrderItem[] = table && Array.isArray(table.order) ? [...table.order] : [];

      for (const item of comandaItems) {
        const existingItem = currentOrderItems.find(i => i.name === item.name);
        if (existingItem) {
          existingItem.qty += item.qty;
        } else {
          currentOrderItems.push({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty
          });
        }
      }

      await updateTableOrder(orderingTableId, currentOrderItems);
      await updateTable(orderingTableId, { status: 'waiting_food' });

      setOrderingTableId(null);
      setComandaItems([]);
      triggerToast(`Comanda enviada a Cocina para Mesa ${orderingTableId.replace('T-', '')}`);
    } catch {
      triggerToast('Error al enviar la comanda', 'error');
    }
  };

  const handleCheckoutClose = async (paymentRef?: string) => {
    if (!checkoutTableId) return;
    // QR con Mercado Pago configurado: primero se muestra el QR y se espera la confirmación
    if (paymentMethod === 'qr' && mpEnabled && !paymentRef) {
      setShowMpQr(true);
      return;
    }
    try {
      const discount = Number(discountInput) || 0;
      // Se registra con el mismo nombre que usan la caja y el mapa de mesas
      const methodLabel = paymentRef ? 'Mercado Pago' : paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'QR';
      await closeOrder(checkoutTableId, methodLabel, { customerDni: dniInput, discountPct: discount, tip: Number(tipInput) || 0, paymentRef });
      await updateTable(checkoutTableId, { status: 'dirty', waiterName: '', order: [] });
      
      setCheckoutTableId(null);
      setScannedTableId(null);
      setDniInput('');
      setDiscountInput('0');
      setTipInput('');
      setShowMpQr(false);
      triggerToast(`Mesa ${checkoutTableId.replace('T-', '')} cobrada con éxito.`);
    } catch (e: any) {
      console.error(e);
      triggerToast(e?.message || 'Error al cobrar la mesa', 'error');
    }
  };

  // Simulated QR Scan trigger
  const triggerScan = () => {
    setIsScanning(true);
    setScannedTableId(null);
    setTimeout(() => {
      // Auto resolve if input matches a table
      const formatted = scanInput.toUpperCase().startsWith('T-') ? scanInput.toUpperCase() : `T-${scanInput}`;
      const found = tables.find(t => t.id === formatted && t.type !== 'wall');
      
      setIsScanning(false);
      if (found) {
        setScannedTableId(found.id);
        triggerToast(`Mesa ${found.id.replace('T-', '')} escaneada.`);
      } else {
        triggerToast('Mesa no encontrada. Intenta con T-01, T-02, etc.', 'error');
      }
    }, 1500);
  };

  // Status mapping
  const statusLabels: Record<Table['status'], string> = {
    available: "Disponible",
    occupied: "Ocupada",
    occupied_no_order: "Ocupada",
    waiting_food: "Espera Cocina",
    consuming: "Consumiendo",
    checkout: "Cuenta Pedida",
    dirty: "Sucia"
  };

  const statusColors: Record<Table['status'], string> = {
    available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    occupied: "bg-emerald-500/25 text-emerald-200 border-emerald-500/40",
    occupied_no_order: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    waiting_food: "bg-amber-500/25 text-amber-300 border-amber-500/40 animate-pulse",
    consuming: "bg-[#0F6B41]/40 text-emerald-200 border-[#0F6B41]",
    checkout: "bg-[#FA4515]/30 text-orange-200 border-[#FA4515] animate-pulse",
    dirty: "bg-slate-500/20 text-slate-400 border-slate-500/30"
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#142E25] text-slate-100 max-w-[430px] mx-auto border-x border-[#1E4437] shadow-2xl relative font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "absolute top-4 left-4 right-4 z-[60] p-4 rounded-2xl border shadow-2xl transition-all duration-300 flex items-center justify-between",
          toast.type === 'success' 
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200' 
            : 'bg-red-950/95 border-red-500/50 text-red-200'
        )}>
          <div className="text-xs font-bold uppercase tracking-wider">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-[10px] uppercase font-bold opacity-60">X</button>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-[#1E4437]/90 backdrop-blur-md flex items-center justify-between px-5 border-b border-white/10 sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-[#FA4515]" />
          <h1 className="text-base font-bold text-white tracking-tight">
            LYNX <span className="text-emerald-400">Mozo</span>
          </h1>
        </div>
        <SyncStatusBadge className="ml-auto mr-3" />
        <button 
          onClick={handleLogout}
          className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Body Scrollable */}
      <main className="flex-1 overflow-y-auto p-5 pb-24">
        
        {/* TAB 1: TABLES */}
        {activeTab === 'tables' && !orderingTableId && (
          <div className="space-y-5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar mesa (ej: T-01)..." 
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full bg-[#182C24] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs outline-none focus:border-[#0F6B41] focus:ring-1 focus:ring-[#0F6B41] transition-all font-semibold"
              />
            </div>

            {/* List */}
            <div className="space-y-4">
              {tables
                .filter(t => t.type !== 'wall' && (t.id.toLowerCase().includes(tableSearch.toLowerCase()) || (t.waiterName && t.waiterName.toLowerCase().includes(tableSearch.toLowerCase()))))
                .map((table) => {
                  const isExpanded = !!expandedTables[table.id];
                  const totalItemsPrice = table.order.reduce((acc, i) => acc + (i.price * i.qty), 0);
                  const elapsedMinutes = table.lastUpdate ? Math.floor((Date.now() - new Date(table.lastUpdate).getTime()) / 60000) : null;
                  
                  // Kitchen comanda states
                  const activeComandas = comandas?.filter(c => c.tableId === table.id) || [];
                  const pendingItems = new Set(activeComandas.filter(c => c.status === 'pending' || c.status === 'cooking').flatMap(c => c.items.map(i => i.name)));
                  const readyItems = new Set(activeComandas.filter(c => c.status === 'ready').flatMap(c => c.items.map(i => i.name)));

                  return (
                    <div 
                      key={table.id}
                      className={cn(
                        "bg-[#182C24] border border-white/10 rounded-3xl overflow-hidden transition-all duration-200",
                        table.status === 'checkout' ? "ring-2 ring-red-500/20 border-red-500/50" : ""
                      )}
                    >
                      {/* Accordion Trigger */}
                      <div 
                        onClick={() => setExpandedTables(prev => ({ ...prev, [table.id]: !prev[table.id] }))}
                        className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-850/50 select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black text-xs text-white",
                            table.status === 'available' ? "bg-emerald-600" :
                            table.status === 'dirty' ? "bg-slate-700" :
                            table.status === 'checkout' ? "bg-rose-600 animate-pulse" :
                            "bg-[#0F6B41]"
                          )}>
                            {table.id}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs">Mesa {table.id.split('-')[1] || table.id}</h4>
                            <span className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1 inline-block", statusColors[table.status])}>
                              {statusLabels[table.status]}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            {table.status !== 'available' && table.status !== 'dirty' && (
                              <div className="font-bold text-amber-500 text-xs tabular-nums">{formatMoney(totalItemsPrice)}</div>

                            )}
                            {table.waiterName && (
                              <div className="text-[8px] text-slate-500 font-bold uppercase">{table.waiterName}</div>
                            )}
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-200", isExpanded ? "rotate-180 text-emerald-400" : "")} />
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/10/50 bg-[#121E19]/20 space-y-3">
                          {table.status !== 'available' && elapsedMinutes !== null && (
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                              <span>TIEMPO ACTIVA:</span>
                              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-full">⏱ {elapsedMinutes} min</span>
                            </div>
                          )}

                          {/* Items Detail */}
                          <div className="space-y-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-1">Productos Comandados</span>
                            {table.order.length === 0 ? (
                              <span className="text-[10px] text-slate-500 italic block">Sin ítems comandados aún</span>
                            ) : (
                              <div className="divide-y divide-slate-800 bg-[#121E19]/40 rounded-xl border border-white/10/60 p-3 space-y-1.5">
                                {table.order.map((item, idx) => {
                                  let stateLabel = "🍽 Servido";
                                  let stateColor = "text-slate-500";
                                  if (readyItems.has(item.name)) {
                                    stateLabel = "🔔 Listo";
                                    stateColor = "text-emerald-450 font-black animate-pulse";
                                  } else if (pendingItems.has(item.name)) {
                                    stateLabel = "🍳 Cocina";
                                    stateColor = "text-amber-450 font-semibold";
                                  }
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-[10px] text-slate-300 pt-1.5 first:pt-0">
                                      <span className="font-medium truncate max-w-[150px]">{item.name}</span>
                                      <div className="flex gap-2 items-center">
                                        <span className="font-black text-white">x{item.qty}</span>
                                        <span className={cn("text-[7.5px] font-black uppercase bg-[#182C24] border border-white/10 px-1 rounded", stateColor)}>
                                          {stateLabel}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            {table.status === 'dirty' && (
                              <button 
                                onClick={(e) => handleCleanTable(table.id, e)}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-505 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                🧹 Habilitar
                              </button>
                            )}
                            {table.status !== 'available' && table.status !== 'dirty' && table.status !== 'checkout' && (
                              <button 
                                onClick={() => handleSolicitarCuenta(table.id)}
                                className="flex-1 min-h-[44px] py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                🔔 Pedir cuenta
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setOrderingTableId(table.id);
                                setComandaItems([]);
                              }}
                              className="flex-1 min-h-[44px] py-2 bg-[#0F6B41] hover:bg-[#0C5734] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              🍳 Comandar
                            </button>
                            {table.status !== 'available' && table.status !== 'dirty' && (
                              <button 
                                onClick={() => setCheckoutTableId(table.id)}
                                className="flex-1 min-h-[44px] py-2 bg-[#FA4515] hover:bg-[#e03a0e] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                💵 Cobrar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Ordering mode (under tab tables) */}
        {orderingTableId && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setOrderingTableId(null)}
                className="p-2 bg-[#182C24] border border-white/10 text-slate-300 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-black text-sm">Nueva Comanda: Mesa {orderingTableId.replace('T-', '')}</h3>
            </div>

            {/* Cart summary */}
            <div className="bg-[#182C24] border border-white/10 p-4 rounded-3xl space-y-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedido Actual</h4>
              {comandaItems.length === 0 ? (
                <span className="text-xs text-slate-500 italic block">Agrega productos abajo...</span>
              ) : (
                <div className="space-y-2.5 divide-y divide-slate-800">
                  {comandaItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start pt-2 first:pt-0 text-xs">
                      <div>
                        <span className="font-bold text-white uppercase">{item.name}</span>
                        <input 
                          type="text" 
                          placeholder="Nota (sin cebolla, cocido...)"
                          value={item.note}
                          onChange={(e) => handleUpdateNote(item.name, e.target.value)}
                          className="w-full bg-[#121E19] border border-white/10 rounded px-2 py-1 text-[11px] mt-1 outline-none text-slate-300 focus:border-[#0F6B41]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateQty(item.name, -1)} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/15 cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="font-bold text-sm px-1 text-white tabular-nums">{item.qty}</span>
                        <button onClick={() => handleUpdateQty(item.name, 1)} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/15 cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={handleSendComanda}
                    className="w-full min-h-[44px] mt-3 py-3 bg-[#0F6B41] hover:bg-[#0C5734] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <ShoppingBag className="w-4 h-4" /> Enviar comanda a cocina
                  </button>
                </div>
              )}
            </div>

            {/* Menu Items to add */}
            <div className="space-y-3 pt-2">
              <input 
                type="text" 
                placeholder="Buscar plato o bebida..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-[#182C24] border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0F6B41] focus:ring-1 focus:ring-[#0F6B41]/30 transition-all font-medium text-white placeholder:text-slate-400"
              />
              <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {products
                  .filter(p => p.status !== 'inactive' && p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .map(product => (
                    <div 
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="p-3 bg-[#182C24] border border-white/10 hover:border-emerald-500/50 rounded-2xl flex justify-between items-center cursor-pointer active:scale-[0.99] transition-all"
                    >
                      <div>
                        <div className="font-bold text-xs uppercase text-white">{product.name}</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{product.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-500 text-xs tabular-nums">{formatMoney(product.price)}</span>
                        <span className="p-1 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs"><Plus className="w-3.5 h-3.5" /></span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CARTA (View-only catalogue for waitstaff query) */}
        {activeTab === 'menu' && (
          <div className="space-y-5">
            <h3 className="font-black text-lg text-white">Carta Digital</h3>
            <input 
              type="text" 
              placeholder="Buscar platos o bebidas en el menú..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full bg-[#182C24] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-[#0F6B41] transition-all font-semibold"
            />
            
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {products
                .filter(p => p.status !== 'inactive' && p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map(product => (
                  <div key={product.id} className="p-4 bg-[#182C24] border border-white/10 rounded-3xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-xs uppercase text-white">{product.name}</h4>
                        <span className="text-[8.5px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mt-1 inline-block uppercase">
                          {product.category}
                        </span>
                      </div>
                      <span className="font-bold text-sm text-amber-500 tabular-nums">{formatMoney(product.price)}</span>
                    </div>

                    {product.description && (
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">{product.description}</p>
                    )}
                    <div className="flex gap-3 text-[9px] font-bold text-slate-500 pt-1 border-t border-white/10/50">
                      <span>Stock: <b className="text-white">{product.stock}</b></span>
                      <span>•</span>
                      <span>Disponibilidad: <b className="text-emerald-400">Carta QR Activo</b></span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: SCANNER */}
        {activeTab === 'scan' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <h3 className="font-black text-lg text-white">Escanear QR de Mesa</h3>
            
            {/* Live Camera Scanner Box */}
            <div className="relative min-h-[220px] bg-[#182C24] border border-white/10 rounded-3xl overflow-hidden flex flex-col items-center justify-center p-4">
              {isScanning ? (
                <div id={qrReaderId} className="w-full h-full min-h-[220px] overflow-hidden rounded-2xl" />
              ) : (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400">
                    <QrCode className="w-10 h-10 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs">Cámara de Escaneo QR</h4>
                    <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                      Presiona el botón de abajo para activar tu cámara y escanear el código QR en la mesa del cliente.
                    </p>
                  </div>
                  {scanningError && (
                    <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg max-w-[220px]">{scanningError}</p>
                  )}
                  <button 
                    onClick={startScanning}
                    className="mt-2 px-5 py-2.5 bg-[#0F6B41] hover:bg-[#0F6B41] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Smartphone className="w-4 h-4" /> ACTIVAR CÁMARA
                  </button>
                </div>
              )}
              {/* Scan laser line overlay */}
              {isScanning && (
                <div className="absolute left-0 right-0 h-0.5 bg-red-500 top-1/2 -translate-y-1/2 animate-[scan-line_1.5s_infinite] pointer-events-none z-10" />
              )}
            </div>

            {/* Cancel Button */}
            {isScanning && (
              <button 
                onClick={stopScanning}
                className="w-full py-3 bg-[#182C24] border border-white/10 hover:bg-slate-800 text-slate-350 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Cancelar Escaneo
              </button>
            )}

            {/* Quick manual selection if scanner is not needed */}
            {!isScanning && (
              <div className="space-y-3 bg-[#182C24] border border-white/10 p-5 rounded-3xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Entrada Manual</span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Mesa (ej: 01, T-01)"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="flex-1 bg-[#121E19] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none uppercase focus:border-[#0F6B41]"
                  />
                  <button 
                    onClick={() => {
                      const formatted = scanInput.toUpperCase().startsWith('T-') ? scanInput.toUpperCase() : `T-${scanInput}`;
                      const found = tables.find(t => t.id === formatted && t.type !== 'wall');
                      if (found) {
                        setScannedTableId(found.id);
                        triggerToast(`Mesa ${found.id.replace('T-', '')} cargada.`);
                      } else {
                        triggerToast('Mesa no encontrada. Intenta con T-01, T-02, etc.', 'error');
                      }
                    }}
                    disabled={!scanInput.trim()}
                    className="px-4 py-2.5 bg-[#0F6B41] hover:bg-[#0F6B41] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            )}

            {/* Loader scanned table card if loaded */}
            {scannedTableId && (() => {
              const table = tables.find(t => t.id === scannedTableId);
              if (!table) return null;
              const totalItemsPrice = table.order.reduce((acc, i) => acc + (i.price * i.qty), 0);
              const elapsedMinutes = table.lastUpdate ? Math.floor((Date.now() - new Date(table.lastUpdate).getTime()) / 60000) : null;

              return (
                <div className="bg-[#182C24] border border-emerald-500/20 shadow-xl rounded-3xl p-5 space-y-4">
                  <div className="flex justify-between items-start border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0F6B41] rounded-xl flex items-center justify-center font-black text-xs text-white">
                        {table.id}
                      </div>
                      <div>
                        <h4 className="font-black text-xs">Mesa {table.id.split('-')[1] || table.id}</h4>
                        <span className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1 inline-block", statusColors[table.status])}>
                          {statusLabels[table.status]}
                        </span>
                      </div>
                    </div>
                    {table.waiterName && (
                      <span className="text-[9px] bg-slate-800 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-slate-400">
                        {table.waiterName}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-350 space-y-2">
                    {elapsedMinutes !== null && (
                      <div className="flex justify-between">
                        <span>Tiempo activa:</span>
                        <span className="font-bold text-white">{elapsedMinutes} minutos</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Total Consumido:</span>
                      <span className="font-bold text-amber-500 text-sm tabular-nums">{formatMoney(totalItemsPrice)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {table.status !== 'available' && table.status !== 'dirty' && table.status !== 'checkout' && (
                      <button 
                        onClick={() => handleSolicitarCuenta(table.id)}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-650 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        🔔 Pedir Cuenta
                      </button>
                    )}
                    {table.status !== 'available' && table.status !== 'dirty' && (
                      <button 
                        onClick={() => setCheckoutTableId(table.id)}
                        className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-650 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        💵 Cobrar Cuenta
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </main>

      {/* Checkout Modal Overlay inside Mobile View */}
      {checkoutTableId && (() => {
        const table = tables.find(t => t.id === checkoutTableId);
        if (!table) return null;
        // Mismo cálculo que se registra al cobrar (impuestos según configuración)
        const totalItemsPrice = computeTotals(table.order.reduce((acc, i) => acc + (i.price * i.qty), 0)).total;

        return (
          <div className="fixed inset-0 bg-[#121E19]/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-[#182C24] border border-white/10 rounded-3xl w-full max-w-[360px] p-6 space-y-5" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-sm uppercase text-white">Cobrar Mesa {checkoutTableId.replace('T-', '')}</h3>
                <button onClick={() => setCheckoutTableId(null)} className="text-slate-500 hover:text-white text-xs">X</button>
              </div>

              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-400">Total Consumido:</span>
                  <span className="text-base font-bold text-amber-500 tabular-nums">{formatMoney(totalItemsPrice)}</span>
                </div>


                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-1 bg-[#121E19] p-1 rounded-xl border border-white/10">
                    {(['cash', 'card', 'qr'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          "py-2 text-xs font-semibold uppercase rounded-lg transition-all cursor-pointer",
                          paymentMethod === method ? "bg-[#0F6B41] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : 'QR'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block">DNI Cliente (Opcional - Puntos)</label>
                  <input 
                    type="text" 
                    placeholder="DNI del cliente..."
                    value={dniInput}
                    onChange={(e) => setDniInput(e.target.value)}
                    className="w-full bg-[#121E19] border border-white/10 rounded-xl px-3 py-2 text-xs font-medium outline-none text-white focus:border-[#0F6B41]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block">Descuento (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    placeholder="Descuento..."
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full bg-[#121E19] border border-white/10 rounded-xl px-3 py-2 text-xs font-medium outline-none text-white focus:border-[#0F6B41]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block">Propina ($, no suma a la venta)</label>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="0" 
                    value={tipInput} 
                    onChange={(e) => setTipInput(e.target.value)} 
                    className="w-full bg-[#121E19] border border-white/10 rounded-xl px-3 py-2 text-xs font-medium outline-none text-white focus:border-[#0F6B41]" 
                  />
                </div>
              </div>

              {showMpQr && (
                <div className="bg-white rounded-2xl p-4">
                  <MercadoPagoQr
                    amount={Math.round((totalItemsPrice * (1 - (Number(discountInput) || 0) / 100) + (Number(tipInput) || 0)) * 100) / 100}
                    description={`Mesa ${checkoutTableId.replace('T-', '')}`}
                    tableId={checkoutTableId}
                    onApproved={(paymentId) => handleCheckoutClose(paymentId)}
                    onCancel={() => setShowMpQr(false)}
                  />
                </div>
              )}

              {!showMpQr && (
                <button
                  onClick={async () => {
                    const err = await printTicket({
                      title: `Mesa ${checkoutTableId.replace('T-', '')}`,
                      items: table.order.map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
                      subtotal: table.order.reduce((a: number, i: any) => a + i.price * i.qty, 0),
                      total: totalItemsPrice, preBill: true,
                    });
                    triggerToast(err || 'Cuenta enviada a la impresora', err ? 'error' : 'success');
                  }}
                  className="w-full min-h-[44px] py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Imprimir cuenta
                </button>
              )}

              {!showMpQr && <button 
                onClick={() => handleCheckoutClose()}
                className="w-full min-h-[48px] py-3 bg-[#FA4515] hover:bg-[#e03a0e] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Wallet className="w-4 h-4" /> {paymentMethod === 'qr' && mpEnabled ? 'Generar QR de Mercado Pago' : 'Confirmar pago y cerrar'}
              </button>}
            </div>
          </div>
        );
      })()}

      {/* Navigation Footer Bar */}
      <footer className="h-16 bg-[#1E4437] border-t border-white/10 flex items-center justify-around px-2 sticky bottom-0 z-40 shrink-0 select-none">
        <button 
          onClick={() => { setActiveTab('tables'); setOrderingTableId(null); }}
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] font-semibold uppercase transition-colors py-1 px-3.5 rounded-xl cursor-pointer",
            activeTab === 'tables' ? "text-white bg-[#0F6B41] shadow-sm" : "text-slate-300 hover:text-white"
          )}
        >
          <Utensils className="w-5 h-5" />
          <span>Mesas</span>
        </button>
        <button 
          onClick={() => { setActiveTab('menu'); setOrderingTableId(null); }}
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] font-semibold uppercase transition-colors py-1 px-3.5 rounded-xl cursor-pointer",
            activeTab === 'menu' ? "text-white bg-[#0F6B41] shadow-sm" : "text-slate-300 hover:text-white"
          )}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Carta</span>
        </button>
        <button 
          onClick={() => { setActiveTab('scan'); setOrderingTableId(null); }}
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] font-semibold uppercase transition-colors py-1 px-3.5 rounded-xl cursor-pointer",
            activeTab === 'scan' ? "text-white bg-[#0F6B41] shadow-sm" : "text-slate-300 hover:text-white"
          )}
        >
          <QrCode className="w-5 h-5" />
          <span>Escanear QR</span>
        </button>
      </footer>

    </div>
  );
}
