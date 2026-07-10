import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  ChevronRight,
  Receipt,
  Package,
  Zap,
  MonitorCheck,
  X,
  Wallet,
  CreditCard,
  ArrowRightLeft,
  Smartphone,
  User,
  ArrowRight,
  Minus,
  Plus,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useStore } from "../contexts/StoreContext";
import { useBusiness } from "../contexts/BusinessContext";
import { cn } from "../lib/utils";

interface ContextMenuState {
  x: number;
  y: number;
  tableId: string;
}

export function Dashboard() {
  const { tables, orders, products, closeOrder, updateCustomerPoints } = useStore();
  const { taxRate } = useBusiness();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Checkout modal state
  const [checkoutTableId, setCheckoutTableId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [loyaltyIds, setLoyaltyIds] = useState<string[]>([]);
  const [comensales, setComensales] = useState(1);

  // Resize loyaltyIds array when comensales changes
  const changeComensales = (next: number) => {
    setComensales(next);
    setLoyaltyIds(prev => {
      const arr = [...prev];
      while (arr.length < next) arr.push("");
      return arr.slice(0, next);
    });
  };

  const setLoyaltyIdAt = (index: number, value: string) => {
    setLoyaltyIds(prev => {
      const arr = [...prev];
      arr[index] = value;
      return arr;
    });
  };

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const checkoutTable = tables.find(t => t.id === checkoutTableId);
  const orderItems = checkoutTable?.order || [];
  const subtotal = orderItems.reduce((acc: number, item: any) => acc + item.price * item.qty, 0);
  const taxes = subtotal * (taxRate / 100);
  const total = subtotal + taxes;
  const perPerson = comensales > 1 ? total / comensales : null;
  const registeredDiners = loyaltyIds.filter(id => id.trim().length > 0);
  const totalPoints = Math.floor(total / 10);
  const pointsPerRegistered = registeredDiners.length > 0 ? Math.floor(totalPoints / registeredDiners.length) : 0;

  const handleContextMenu = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tableId });
  };

  const openCheckout = (tableId: string) => {
    setContextMenu(null);
    setCheckoutTableId(tableId);
    setPaymentMethod("Efectivo");
    setLoyaltyIds([]);
    setComensales(1);
  };

  const handleCloseOrder = async () => {
    if (!checkoutTableId) return;
    // Distribute loyalty points among registered diners
    if (pointsPerRegistered > 0) {
      await Promise.allSettled(
        registeredDiners.map(dni => updateCustomerPoints(dni.trim(), pointsPerRegistered, `Mesa ${checkoutTableId} - Cuenta Dividida`))
      );
    }
    // Close order using the first registered loyalty ID (or undefined)
    await closeOrder(checkoutTableId, paymentMethod, registeredDiners[0] || undefined);
    setCheckoutTableId(null);
  };

  const performanceData = (() => {
    const daysLabels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTotal = orders
        .filter((o: any) => o.timestamp?.startsWith(dateStr))
        .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      data.push({ name: daysLabels[i], value: dayTotal });
    }
    return data;
  })();

  const totalSalesToday = orders
    .filter((o: any) => o.timestamp?.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((acc: number, o: any) => acc + (o.total || 0), 0);

  const activeTablesCount = tables.filter(t => t.status === "occupied").length;
  const pendingOrdersCount = tables.filter((t: any) => t.orderItems && t.orderItems.length > 0).length;
  const stockAlertsCount = products.filter((p: any) => p.stock < 5).length;

  const STATUS_COLORS: Record<string, string> = {
    available: "bg-emerald-50 border-emerald-200 text-emerald-700",
    occupied_no_order: "bg-sky-50 border-sky-200 text-sky-700",
    waiting_food: "bg-amber-50 border-amber-200 text-amber-700",
    consuming: "bg-purple-50 border-purple-200 text-purple-700",
    checkout: "bg-rose-50 border-rose-200 text-rose-700",
    dirty: "bg-stone-50 border-stone-200 text-stone-700",
    occupied: "bg-rose-50 border-rose-200 text-rose-700",
  };

  const STATUS_LABELS: Record<string, string> = {
    available: "Libre",
    occupied_no_order: "Ocupada (Sin Pedido)",
    waiting_food: "Esperando Platos",
    consuming: "Consumiendo",
    checkout: "Pidiendo Cuenta",
    dirty: "Sucia (Limpieza)",
    occupied: "Ocupada",
  };

  const isOccupied = (status: string) =>
    status !== "available" && status !== "dirty";

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Scroll Velocity / Ticker Marquee */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden py-3.5 shadow-lg relative flex items-center">
        {/* Glow / Fade Effects on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
        
        {/* Marquee Track */}
        <div className="flex whitespace-nowrap animate-marquee">
          <div className="flex gap-16 text-[10px] font-black uppercase tracking-widest text-slate-400 items-center">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Facturación Hoy: <strong className="text-white">${totalSalesToday.toLocaleString()}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Mesas Activas: <strong className="text-white">{activeTablesCount} / {tables.length}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Comandas en curso: <strong className="text-white">{pendingOrdersCount}</strong>
            </span>
            {stockAlertsCount > 0 && (
              <span className="flex items-center gap-2 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Alertas de Stock: <strong className="text-red-200">{stockAlertsCount} productos bajos</strong>
              </span>
            )}
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Terminal Local: <strong className="text-white">Conectado LYNX-Host</strong>
            </span>
          </div>
          {/* Duplicate for seamless looping */}
          <div className="flex gap-16 text-[10px] font-black uppercase tracking-widest text-slate-400 items-center ml-16">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Facturación Hoy: <strong className="text-white">${totalSalesToday.toLocaleString()}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Mesas Activas: <strong className="text-white">{activeTablesCount} / {tables.length}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Comandas en curso: <strong className="text-white">{pendingOrdersCount}</strong>
            </span>
            {stockAlertsCount > 0 && (
              <span className="flex items-center gap-2 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Alertas de Stock: <strong className="text-red-200">{stockAlertsCount} productos bajos</strong>
              </span>
            )}
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Terminal Local: <strong className="text-white">Conectado LYNX-Host</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ventas Hoy</div>
            <div className="text-2xl font-bold text-slate-900">${totalSalesToday.toLocaleString()}</div>
            <div className="text-emerald-500 text-xs font-medium mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sincronizado
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ocupación</div>
            <div className="text-2xl font-bold text-slate-900">{activeTablesCount} / {tables.length}</div>
            <div className="text-slate-400 text-xs mt-2 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              Mesas activas
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Comandas en Curso</div>
            <div className="text-2xl font-bold text-slate-900">{pendingOrdersCount}</div>
            <div className="text-amber-500 text-xs mt-2 flex items-center font-medium">
              <Clock className="h-3 w-3 mr-1" />
              En preparación
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-amber-500">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Alertas Stock</div>
            <div className="text-2xl font-bold text-slate-900">{stockAlertsCount}</div>
            <div className="text-red-500 text-xs mt-2 flex items-center font-medium">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Revisar inventario
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-red-500">
            <Package className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sales Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-800">Resumen Semanal de Ventas</h3>
              <p className="text-sm font-medium text-slate-500">Histórico acumulado de ingresos</p>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }} dy={10} interval={0} padding={{ left: 20, right: 20 }} />
                <YAxis hide={true} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
            <h3 className="font-bold text-slate-800 mb-6">Acciones Rápidas</h3>
            <div className="space-y-3">
              <Link to="/pos" className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <MonitorCheck className="h-5 w-5" />
                  <span className="font-semibold text-sm">Venta Rápida (POS)</span>
                </div>
                <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link to="/mapa" className="w-full flex items-center justify-between p-4 border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span className="font-semibold text-sm">Mapa de Mesas</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>
              <Link to="/finanzas" className="w-full flex items-center justify-between p-4 border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-emerald-500" />
                  <span className="font-semibold text-sm">Ingresos/Gastos</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-1 opacity-60">SISTEMA</h4>
              <p className="text-white text-xl font-bold mb-4">Estado Operativo</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <p className="text-slate-400 text-xs">Vínculo con base de datos activo.</p>
              </div>
            </div>
            <Zap className="absolute -right-4 -bottom-4 h-32 w-32 text-indigo-500/10" />
          </div>
        </div>
      </div>

      {/* Live Salon Tables Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-slate-800">Estado de Mesas en Vivo</h3>
            <p className="text-sm font-medium text-slate-500">Clic derecho para cerrar mesa · Ocupación, tiempos y consumos actuales</p>
          </div>
          <Link to="/mapa" className="text-indigo-600 text-xs font-black hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1">
            Ver Mapa Completo <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables
            .filter(t => t.type !== "wall" && t.type !== "bar")
            .map(table => {
              const tableTotal = table.order?.reduce((acc: number, item: any) => acc + item.price * item.qty, 0) || 0;
              const itemUnits = table.order?.reduce((acc: number, item: any) => acc + item.qty, 0) || 0;
              const elapsedMinutes =
                table.lastUpdate && isOccupied(table.status)
                  ? Math.floor((Date.now() - new Date(table.lastUpdate).getTime()) / 60000)
                  : null;

              return (
                <div
                  key={table.id}
                  className={cn(
                    "p-4 rounded-xl border flex flex-col justify-between h-28 transition-all hover:shadow-md select-none",
                    isOccupied(table.status) ? "cursor-context-menu" : "cursor-default",
                    STATUS_COLORS[table.status] || "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                  onContextMenu={isOccupied(table.status) ? e => handleContextMenu(e, table.id) : e => e.preventDefault()}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-black text-sm uppercase">{table.id}</span>
                    {elapsedMinutes !== null && (
                      <span className="text-[9px] bg-black/5 px-1.5 py-0.5 rounded-full font-bold">⏱ {elapsedMinutes}m</span>
                    )}
                  </div>

                  <div className="mt-2 flex-1">
                    {!isOccupied(table.status) ? (
                      <p className="text-[10px] font-black uppercase opacity-75">{STATUS_LABELS[table.status] || table.status}</p>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold truncate">Mozo: {table.waiterName || "Sin asignar"}</p>
                        <p className="text-[9px] font-medium opacity-80">{itemUnits} items pedidos</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/5">
                    <span className="text-[9px] font-black uppercase opacity-60">
                      {!isOccupied(table.status) ? `Cap: ${table.capacity}` : "Consumo:"}
                    </span>
                    <span className="text-xs font-black">
                      {isOccupied(table.status) ? `$${tableTotal.toLocaleString()}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Floating Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[500] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
          style={{ top: contextMenu.y, left: contextMenu.x, minWidth: 200 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa {contextMenu.tableId}</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => openCheckout(contextMenu.tableId)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-50 text-rose-600 transition-all text-sm font-bold text-left"
            >
              <Receipt className="w-4 h-4 flex-shrink-0" />
              Cerrar Mesa (Cobrar)
            </button>
            <button
              onClick={() => setContextMenu(null)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-500 transition-all text-sm font-bold text-left"
            >
              <X className="w-4 h-4 flex-shrink-0" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutTableId && checkoutTable && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-[600] flex items-center justify-center p-6" onClick={() => setCheckoutTableId(null)}>
          <div
            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900">Cobrar Mesa {checkoutTableId}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Cerrar cuenta y registrar pago</p>
              </div>
              <button onClick={() => setCheckoutTableId(null)} className="p-3 text-slate-400 hover:bg-white hover:text-rose-500 rounded-full transition-all border border-transparent hover:border-slate-100">
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="p-10 space-y-7 max-h-[75vh] overflow-y-auto">
              {/* Order summary */}
              {orderItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Consumo de la Mesa</p>
                  {orderItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">{item.name} × {item.qty}</span>
                      <span className="font-bold text-slate-900">${(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "Efectivo", icon: Wallet, label: "Efectivo" },
                    { id: "Tarjeta", icon: CreditCard, label: "Tarjeta" },
                    { id: "Transferencia", icon: ArrowRightLeft, label: "Transf." },
                    { id: "Billetera", icon: Smartphone, label: "Billetera" },
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


              {/* Split Bill + Per-Diner Loyalty */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-400" />
                    Dividir Cuenta
                  </label>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full uppercase">
                    {comensales} {comensales === 1 ? "comensal" : "comensales"}
                  </span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => changeComensales(Math.max(1, comensales - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                  >
                    <Minus className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="flex-1 text-center font-black text-2xl text-slate-900">{comensales}</span>
                  <button
                    onClick={() => changeComensales(comensales + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                {perPerson !== null && (
                  <div className="bg-indigo-600 rounded-2xl p-4 text-white flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Paga cada uno</p>
                      <p className="text-3xl font-black">${Math.ceil(perPerson).toLocaleString()}</p>
                    </div>
                    <div className="text-right opacity-70">
                      <p className="text-[9px] font-black uppercase tracking-widest">× {comensales}</p>
                      <p className="text-xs font-bold">personas</p>
                    </div>
                  </div>
                )}

                {/* Per-diner loyalty fields */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fidelización por Comensal</label>
                    {registeredDiners.length > 0 && (
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        +{pointsPerRegistered} pts c/u · {registeredDiners.length} socio{registeredDiners.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {Array.from({ length: comensales }).map((_, i) => (
                    <div key={i} className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type="text"
                        value={loyaltyIds[i] || ""}
                        onChange={e => setLoyaltyIdAt(i, e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        placeholder={`Comensal ${i + 1} — DNI o N° Socio (opcional)`}
                      />
                    </div>
                  ))}
                  {registeredDiners.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic px-1">Sin socios cargados. No se sumarán puntos.</p>
                  )}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-900 rounded-[2rem] p-7 space-y-3 text-white shadow-2xl">
                <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest px-1">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest px-1">
                  <span>Impuesto ({taxRate}%)</span>
                  <span>${taxes.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-800 mx-1" />
                <div className="flex justify-between items-center px-1">
                  <div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total a Cobrar</div>
                    <div className="text-3xl font-black">${total.toLocaleString()}</div>
                  </div>
                  {registeredDiners.length > 0 && (
                    <div className="text-right">
                      <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Puntos a Sumar</div>
                      <div className="text-lg font-black text-emerald-400">+{Math.floor(total / 10)} pts</div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCloseOrder}
                className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                FINALIZAR Y COBRAR <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
