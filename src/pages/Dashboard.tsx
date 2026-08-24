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
  Award,
  Maximize2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { useStore } from "../contexts/StoreContext";
import { useBusiness } from "../contexts/BusinessContext";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface ContextMenuState {
  x: number;
  y: number;
  tableId: string;
}

export function Dashboard() {
  const { tables, orders, products, closeOrder, updateCustomerPoints } = useStore();
  const { taxRate } = useBusiness();

  // Stats calculation
  const totalSalesToday = orders
    .filter((o: any) => o.timestamp?.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((acc: number, o: any) => acc + (o.total || 0), 0);

  const activeTablesCount = tables.filter(t => t.status === "occupied").length;
  const pendingOrdersCount = tables.filter((t: any) => t.order && t.order.some(i => i.status !== 'ready')).length;
  const stockAlertsCount = products.filter((p: any) => p.stock < 5).length;

  // Chart Data: Weekly Performance
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

  // Chart Data: Top Products
  const topProductsData = (() => {
    const productCounts: Record<string, number> = {};
    orders.forEach((o: any) => {
      o.items?.forEach((item: any) => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.qty;
      });
    });
    return Object.entries(productCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  })();

  // Chart Data: Payment Methods
  const paymentMethodsData = (() => {
    const methods: Record<string, number> = {};
    orders.forEach((o: any) => {
      methods[o.paymentMethod || 'Efectivo'] = (methods[o.paymentMethod || 'Efectivo'] || 0) + (o.total || 0);
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  })();

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // AI Insights simulation based on real data
  const aiInsights = [
    {
      title: "Optimización de Inventario",
      desc: stockAlertsCount > 0 
        ? `Se detectaron ${stockAlertsCount} productos con stock crítico. Se recomienda reposición inmediata para evitar quiebre de stock.`
        : "Niveles de inventario óptimos para el volumen de ventas actual.",
      type: stockAlertsCount > 0 ? "warning" : "success"
    },
    {
      title: "Tendencia de Ventas",
      desc: performanceData[performanceData.length - 1].value > performanceData[performanceData.length - 2].value
        ? "La facturación muestra una tendencia alcista respecto a ayer. ¡Buen trabajo!"
        : "Hoy las ventas están un poco más tranquilas. Considera activar una promoción flash de 'Happy Hour'.",
      type: "info"
    },
    {
      title: "Plato Estrella",
      desc: topProductsData[0] 
        ? `El producto "${topProductsData[0].name}" es tu líder indiscutido. ¿Has pensado en un combo que lo incluya?`
        : "Todavía no hay suficientes datos para identificar el producto estrella.",
      type: "star"
    }
  ];

  // Rest of the existing state and handlers...
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [checkoutTableId, setCheckoutTableId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [loyaltyIds, setLoyaltyIds] = useState<string[]>([]);
  const [comensales, setComensales] = useState(1);

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
    if (pointsPerRegistered > 0) {
      await Promise.allSettled(
        registeredDiners.map(dni => updateCustomerPoints(dni.trim(), pointsPerRegistered, `Mesa ${checkoutTableId} - Cuenta Dividida`))
      );
    }
    await closeOrder(checkoutTableId, paymentMethod, registeredDiners[0] || undefined);
    setCheckoutTableId(null);
  };

  const STATUS_COLORS: Record<string, string> = {
    available: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400",
    waiting_food: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400",
    consuming: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-400",
    checkout: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 animate-pulse",
    dirty: "bg-stone-50 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-400",
    occupied: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400",
  };

  const STATUS_LABELS: Record<string, string> = {
    available: "Libre",
    waiting_food: "En Espera",
    consuming: "Consumiendo",
    checkout: "Cuenta",
    dirty: "Sucia",
    occupied: "Ocupada",
  };

  const isOccupied = (status: string) => status !== "available" && status !== "dirty";

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Ticker Marquee */}
      <div className="w-full bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden py-4 shadow-xl relative flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="flex whitespace-nowrap animate-marquee">
          <div className="flex gap-16 text-[11px] font-black uppercase tracking-widest text-slate-400 items-center">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Facturación Hoy: <strong className="text-white">${totalSalesToday.toLocaleString()}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Mesas Activas: <strong className="text-white">{activeTablesCount} / {tables.length}</strong>
            </span>
            <span className="flex items-center gap-2 text-cyan-400">
              <Zap className="w-4 h-4 fill-cyan-400" />
              LYNX IA: <strong className="text-white">Panel Operativo Escaneado</strong>
            </span>
          </div>
          <div className="flex gap-16 text-[11px] font-black uppercase tracking-widest text-slate-400 items-center ml-16">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Facturación Hoy: <strong className="text-white">${totalSalesToday.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Ventas Hoy", val: `$${totalSalesToday.toLocaleString()}`, icon: Receipt, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400" },
          { label: "Mesas Ocupadas", val: `${activeTablesCount} / ${tables.length}`, icon: Users, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
          { label: "En Preparación", val: pendingOrdersCount, icon: Clock, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
          { label: "Alertas Stock", val: stockAlertsCount, icon: AlertTriangle, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400" },
        ].map((s, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            key={s.label} 
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-wider mb-1">{s.label}</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{s.val}</h3>
            </div>
            <div className={cn("p-4 rounded-2xl", s.color)}>
              <s.icon className="h-6 w-6" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Weekly Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Rendimiento Semanal</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">Ingresos proyectados vs. reales</p>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 900 }} dy={15} />
                <YAxis hide={true} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "20px", 
                    border: "none", 
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    color: "white",
                    padding: "12px 20px"
                  }} 
                  itemStyle={{ color: "#818cf8", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Card */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-slate-900 dark:bg-indigo-950/20 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden border border-indigo-500/20">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="text-white font-black text-lg tracking-tight">LYNX AI Insights</h3>
              </div>
              <div className="space-y-5">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      {insight.type === 'warning' ? <AlertTriangle className="w-3 h-3 text-rose-400" /> : 
                       insight.type === 'star' ? <Award className="w-3 h-3 text-amber-400" /> : 
                       <MonitorCheck className="w-3 h-3 text-emerald-400" />}
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{insight.title}</p>
                    </div>
                    <p className="text-xs text-indigo-100 font-medium leading-relaxed">{insight.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6">Distribución de Pagos</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {paymentMethodsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {paymentMethodsData.map((pm, i) => (
                <div key={pm.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase">{pm.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Tables */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[4rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Operativa del Salón</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">Resumen táctico de ocupación</p>
          </div>
          <Link to="/mapa" className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-indigo-600 dark:text-indigo-400">
            <Maximize2 className="w-5 h-5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {tables
            .filter(t => t.type !== "wall")
            .map(table => {
              const tableTotal = table.order?.reduce((acc: number, item: any) => acc + item.price * item.qty, 0) || 0;
              const elapsedMinutes = table.lastUpdate && isOccupied(table.status)
                ? Math.floor((Date.now() - new Date(table.lastUpdate).getTime()) / 60000)
                : null;

              return (
                <div
                  key={table.id}
                  className={cn(
                    "p-6 rounded-[2rem] border transition-all hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between h-40 select-none",
                    isOccupied(table.status) ? "cursor-context-menu" : "cursor-default",
                    STATUS_COLORS[table.status] || "bg-slate-50 border-slate-200"
                  )}
                  onContextMenu={isOccupied(table.status) ? e => handleContextMenu(e, table.id) : e => e.preventDefault()}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-black text-lg tracking-tighter">{table.id}</span>
                    {elapsedMinutes !== null && (
                      <span className="text-[10px] font-black bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">⏱{elapsedMinutes}m</span>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                      {STATUS_LABELS[table.status] || table.status}
                    </p>
                    {isOccupied(table.status) ? (
                      <p className="text-xs font-black truncate">{table.waiterName || "Staff"}</p>
                    ) : (
                      <p className="text-[10px] font-bold opacity-40">Capacidad: {table.capacity}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                    <span className="text-[9px] font-black uppercase opacity-40">Total</span>
                    <span className="text-sm font-black">${tableTotal.toLocaleString()}</span>
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
          className="fixed z-[500] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150"
          style={{ top: contextMenu.y, left: contextMenu.x, minWidth: 200 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa {contextMenu.tableId}</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => openCheckout(contextMenu.tableId)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-all text-sm font-bold text-left"
            >
              <Receipt className="w-4 h-4 flex-shrink-0" />
              Cerrar Mesa (Cobrar)
            </button>
            <button
              onClick={() => setContextMenu(null)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-all text-sm font-bold text-left"
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
            className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900 dark:text-white">Cobrar Mesa {checkoutTableId}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Cerrar cuenta y registrar pago</p>
              </div>
              <button onClick={() => setCheckoutTableId(null)} className="p-3 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-rose-500 rounded-full transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
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
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name} × {item.qty}</span>
                      <span className="font-bold text-slate-900 dark:text-white">${(item.price * item.qty).toLocaleString()}</span>
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
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none"
                          : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                      )}
                    >
                      <method.icon className={cn("h-5 w-5", paymentMethod === method.id ? "text-white" : "text-indigo-500 dark:text-indigo-400")} />
                      <span className="text-xs font-black uppercase tracking-wider">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>


              {/* Split Bill + Per-Diner Loyalty */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-400" />
                    Dividir Cuenta
                  </label>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-full uppercase">
                    {comensales} {comensales === 1 ? "comensal" : "comensales"}
                  </span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => changeComensales(Math.max(1, comensales - 1))}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 transition-all shadow-sm"
                  >
                    <Minus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                  <span className="flex-1 text-center font-black text-2xl text-slate-900 dark:text-white">{comensales}</span>
                  <button
                    onClick={() => changeComensales(comensales + 1)}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
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
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fidelización por Comensal</label>
                    {registeredDiners.length > 0 && (
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-full">
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
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-xl font-bold text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all"
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
              <div className="bg-slate-900 dark:bg-black rounded-[2rem] p-7 space-y-3 text-white shadow-2xl">
                <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest px-1">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest px-1">
                  <span>Impuesto ({taxRate}%)</span>
                  <span>${taxes.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-800 dark:bg-slate-900 mx-1" />
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
                className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
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
