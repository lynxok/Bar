import React from "react";
import {
  Award,
  Users,
  Gift,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Star,
  ChevronRight,
  TrendingUp,
  History,
  Mail,
  X, // imported X for modal
  Settings,
  Edit2,
  Zap
} from "lucide-react";
import { cn } from "../lib/utils";

const INITIAL_CUSTOMERS = [
  { id: "C-0842", name: "María González", email: "maria.g@example.com", phone: "+54 11 4321-8842", points: 1450, tier: "Gold", returnRate: "Alta", lastVisit: "Hace 2 días" },
  { id: "C-0931", name: "Ana Martínez", email: "ana.martinez@example.com", phone: "+54 11 2234-5511", points: 3400, tier: "Platinum", returnRate: "Muy Alta", lastVisit: "Ayer" },
  { id: "C-0715", name: "Carlos Ruiz", email: "cruiz_89@example.com", phone: "+54 11 5521-9931", points: 280, tier: "Silver", returnRate: "Media", lastVisit: "Hace 1 semana" },
  { id: "C-0888", name: "Lucía Silva", email: "lucia.silva@example.com", phone: "+54 11 9911-2244", points: 890, tier: "Silver", returnRate: "Alta", lastVisit: "Hace 5 días" },
  { id: "C-1102", name: "Diego Fernández", email: "dfernandez@example.com", phone: "+54 11 8842-1123", points: 120, tier: "Bronze", returnRate: "Baja", lastVisit: "Hace 3 semanas" },
];

const INITIAL_REDEMPTIONS = [
  { customer: "Ana Martínez", item: "Descuento 15% Mesa", points: -500, time: "Hace 2 horas" },
  { customer: "María González", item: "Postre de Cortesía", points: -200, time: "Ayer, 21:30" },
  { customer: "Juan Pérez", item: "Botella Vino Reserva", points: -1200, time: "12 May, 20:15" },
];

const INITIAL_CATALOG = [
  { id: 'p1', name: 'Postre de Cortesía', pointsCost: 200, icon: '🍰' },
  { id: 'p2', name: 'Descuento 15% Mesa', pointsCost: 500, icon: '🏷️' },
  { id: 'p3', name: 'Botella Vino Reserva', pointsCost: 1200, icon: '🍷' },
  { id: 'p4', name: 'Cena para 2 Personas', pointsCost: 2500, icon: '🍽️' },
];

const INITIAL_PROMOTIONS = [
  { id: 'prom1', name: 'Doble Puntos en Cafés', multiplier: 2, target: 'Categoría: Café', startDate: '2026-05-01', endDate: '2026-05-31', isActive: true },
  { id: 'prom2', name: 'Finde de Cervezas 3x', multiplier: 3, target: 'Categoría: Cervezas Artesanales', startDate: '2026-05-08', endDate: '2026-05-10', isActive: true },
];

const getTierStyle = (tier: string) => {
  switch (tier) {
    case 'Platinum': return 'bg-slate-900 border-slate-700 text-slate-100 shadow-sm';
    case 'Gold': return 'bg-amber-100 border-amber-200 text-amber-800';
    case 'Silver': return 'bg-slate-100 border-slate-200 text-slate-700';
    case 'Bronze': return 'bg-orange-50 border-orange-100 text-orange-800';
    default: return 'bg-slate-50 border-slate-200 text-slate-600';
  }
};

export function Loyalty() {
  const [customersData, setCustomersData] = React.useState(INITIAL_CUSTOMERS);
  const [redemptionsData, setRedemptionsData] = React.useState(INITIAL_REDEMPTIONS);
  const [catalogData, setCatalogData] = React.useState(INITIAL_CATALOG);
  const [promotionsData, setPromotionsData] = React.useState(INITIAL_PROMOTIONS);
  const [redeemingCustomer, setRedeemingCustomer] = React.useState<any>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = React.useState(false);
  const [isPromotionsModalOpen, setIsPromotionsModalOpen] = React.useState(false);
  
  // Catalog Form
  const [newPrizeName, setNewPrizeName] = React.useState('');
  const [newPrizePoints, setNewPrizePoints] = React.useState('');
  const [newPrizeIcon, setNewPrizeIcon] = React.useState('🎁');

  // Promotions Form
  const [newPromoName, setNewPromoName] = React.useState('');
  const [newPromoMultiplier, setNewPromoMultiplier] = React.useState('2');
  const [newPromoTarget, setNewPromoTarget] = React.useState('');
  const [newPromoStart, setNewPromoStart] = React.useState('');
  const [newPromoEnd, setNewPromoEnd] = React.useState('');

  const [pointValue, setPointValue] = React.useState(0.005);
  const [isEditingPointValue, setIsEditingPointValue] = React.useState(false);
  
  const handleRedeem = (prize: any) => {
    if (!redeemingCustomer || redeemingCustomer.points < prize.pointsCost) return;

    // Deduct points
    setCustomersData(prev => prev.map(c => 
      c.id === redeemingCustomer.id 
        ? { ...c, points: c.points - prize.pointsCost } 
        : c
    ));

    // Add to redemptions history
    setRedemptionsData(prev => [
      {
        customer: redeemingCustomer.name,
        item: prize.name,
        points: -prize.pointsCost,
        time: "Justo ahora"
      },
      ...prev
    ]);

    setRedeemingCustomer(null);
  };

  const handleAddPrize = () => {
    if (!newPrizeName || !newPrizePoints) return;
    const newPrize = {
      id: 'p' + Date.now(),
      name: newPrizeName,
      pointsCost: parseInt(newPrizePoints, 10),
      icon: newPrizeIcon
    };
    setCatalogData([...catalogData, newPrize]);
    setNewPrizeName('');
    setNewPrizePoints('');
    setNewPrizeIcon('🎁');
  };

  const handleDeletePrize = (id: string) => {
    setCatalogData(catalogData.filter(p => p.id !== id));
  };

  const handleAddPromotion = () => {
    if (!newPromoName || !newPromoTarget || !newPromoStart || !newPromoEnd) return;
    const newPromo = {
      id: 'prom' + Date.now(),
      name: newPromoName,
      multiplier: parseInt(newPromoMultiplier, 10),
      target: newPromoTarget,
      startDate: newPromoStart,
      endDate: newPromoEnd,
      isActive: true
    };
    setPromotionsData([...promotionsData, newPromo]);
    setNewPromoName('');
    setNewPromoMultiplier('2');
    setNewPromoTarget('');
    setNewPromoStart('');
    setNewPromoEnd('');
  };

  const handleDeletePromotion = (id: string) => {
    setPromotionsData(promotionsData.filter(p => p.id !== id));
  };

  const togglePromotionStatus = (id: string) => {
    setPromotionsData(promotionsData.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 mb-1">Fidelización y Clientes</h1>
          <p className="text-slate-500 text-sm font-medium">Gestiona recompensas, puntos acumulados y retención de clientes.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPromotionsModalOpen(true)}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center gap-2 font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors uppercase tracking-wider"
          >
            <Zap className="w-4 h-4 text-amber-500" /> Promociones
          </button>
          <button 
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center gap-2 font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors uppercase tracking-wider"
          >
            <Gift className="w-4 h-4 text-emerald-500" /> Catálogo de Premios
          </button>
          <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors uppercase tracking-wider">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Clientes Activos</div>
            <div className="text-3xl font-bold text-slate-900">1,248</div>
            <div className="text-emerald-500 text-xs font-medium mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +84 altas este mes
            </div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Puntos Emitidos</div>
            <div className="text-3xl font-bold text-slate-900">342.5K</div>
            <div className="text-slate-400 text-xs mt-2 flex items-center font-medium">
              <Award className="h-3 w-3 mr-1" />
              Equivalente a ${(342500 * pointValue).toLocaleString('es-AR', {minimumFractionDigits: 2})}
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl text-amber-500">
            <Star className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between relative">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Equivalencia de Puntos</div>
            {isEditingPointValue ? (
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-700">1 pt = $</span>
                  <input 
                    type="number" 
                    step="0.001"
                    min="0"
                    value={pointValue} 
                    onChange={(e) => setPointValue(Number(e.target.value))}
                    className="w-20 px-2 py-1 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-slate-50" 
                  />
                  <button onClick={() => setIsEditingPointValue(false)} className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 transition-colors uppercase tracking-wider">Guardar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-slate-900">${pointValue.toFixed(3)} <span className="text-sm text-slate-500 font-medium">/ pt</span></div>
                <div className="text-slate-400 text-xs mt-2 flex items-center font-medium">
                  <Settings className="h-3 w-3 mr-1 bg-slate-100 rounded text-slate-500 p-0.5" />
                  $100 = {Math.floor(100 / pointValue)} puntos
                </div>
              </>
            )}
          </div>
          <button 
            onClick={() => setIsEditingPointValue(!isEditingPointValue)} 
            className="bg-slate-50 p-3 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
            title="Configurar equivalencia de puntos"
          >
            {isEditingPointValue ? <X className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
          </button>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Retorno Escaneado</div>
            <div className="text-3xl font-bold text-white">42.8%</div>
            <div className="text-emerald-400 text-[11px] mt-2 flex items-center font-medium">
              <TrendingUp className="h-3 w-3 mr-1" />
              Excelente (+5%)
            </div>
          </div>
          <div className="bg-white/10 p-4 rounded-xl text-white relative z-10 backdrop-blur-sm shrink-0">
            <History className="h-6 w-6" />
          </div>
          {/* Decorative background glow */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Customer Database */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h3 className="font-bold text-lg text-slate-800">Directorio de Clientes</h3>
             <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <button className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                  <Filter className="w-5 h-5" />
                </button>
             </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nivel</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Puntos Acumulados</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Última Visita</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customersData.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {c.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {c.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                        getTierStyle(c.tier)
                      )}>
                        {c.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-800">{c.points.toLocaleString()} pts</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{c.lastVisit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          className="px-4 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors border border-emerald-200"
                          onClick={() => setRedeemingCustomer(c)}
                        >
                          Canjear
                        </button>
                        <button className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200">
                          Perfil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500 font-medium">Mostrando 1-5 de 1,248 clientes</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-200 text-slate-400 rounded-md cursor-not-allowed">Anterior</button>
              <button className="px-3 py-1 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md transition-colors font-medium">Siguiente</button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6">
          
          {/* Quick Scanner Check-in */}
          <div className="bg-indigo-600 rounded-2xl shadow-lg border border-indigo-500 p-6 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-white text-lg mb-2">Escáner de Cliente</h3>
              <p className="text-indigo-200 text-xs mb-6 max-w-[80%]">Ingresa el ID, DNI o Teléfono para sumar puntos a un cliente.</p>
              
              <div className="flex gap-2 relative">
                <input 
                  type="text" 
                  placeholder="Ej: +54 11..." 
                  className="w-full bg-white/10 border border-indigo-400 text-white placeholder:text-indigo-300 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-white transition-all text-sm font-medium"
                />
                <button className="bg-white text-indigo-600 px-4 py-3 rounded-xl font-bold shadow-md hover:bg-slate-50 transition-colors">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Watermark icon */}
            <Award className="absolute -right-6 -bottom-6 w-40 h-40 text-white opacity-5 pointer-events-none" />
          </div>

          {/* Recent Redemptions */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-6">Últimos Canjes</h3>
            
            <div className="space-y-4">
              {redemptionsData.map((redemption, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center shrink-0 text-amber-500">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{redemption.customer}</p>
                    <p className="text-xs text-slate-500 font-medium line-clamp-1">{redemption.item}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className="text-sm font-bold text-red-500">{redemption.points} pts</span>
                    <span className="text-[10px] text-slate-400 font-medium">{redemption.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors">
              Ver Historial Completo
            </button>
          </div>
          
        </div>
      </div>

      {/* Redemption Modal */}
      {redeemingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Canjear Premios</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Cliente: <span className="font-bold text-slate-700">{redeemingCustomer.name}</span> • 
                  Puntos Disponibles: <span className="font-bold text-indigo-600">{redeemingCustomer.points}</span>
                </p>
              </div>
              <button 
                onClick={() => setRedeemingCustomer(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {catalogData.map(prize => {
                const canAfford = redeemingCustomer.points >= prize.pointsCost;
                return (
                  <div 
                    key={prize.id} 
                    className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between h-32 transition-colors",
                      canAfford 
                        ? "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm" 
                        : "border-slate-100 bg-slate-50 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{prize.icon}</span>
                        <h3 className="font-bold text-slate-800 leading-tight">{prize.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <span className={cn("text-lg font-bold", canAfford ? "text-indigo-600" : "text-slate-500")}>
                        {prize.pointsCost} <span className="text-xs font-medium">pts</span>
                      </span>
                      <button
                        onClick={() => handleRedeem(prize)}
                        disabled={!canAfford}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm font-bold transition-colors",
                          canAfford 
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        {canAfford ? 'Canjear' : 'Insuficiente'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Catalog Management Modal */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Catálogo de Premios</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Administra los premios que tus clientes pueden canjear con sus puntos.
                </p>
              </div>
              <button 
                onClick={() => setIsCatalogModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              {/* Add New Prize Form */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ícono</label>
                  <input 
                    type="text" 
                    value={newPrizeIcon} 
                    onChange={(e) => setNewPrizeIcon(e.target.value)}
                    className="w-16 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="🎁"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Premio</label>
                  <input 
                    type="text" 
                    value={newPrizeName} 
                    onChange={(e) => setNewPrizeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej. Postre Helado..."
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Puntos</label>
                  <input 
                    type="number" 
                    value={newPrizePoints} 
                    onChange={(e) => setNewPrizePoints(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="200"
                  />
                </div>
                <button 
                  onClick={handleAddPrize}
                  disabled={!newPrizeName || !newPrizePoints}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors tracking-wide h-[42px]"
                >
                  Agregar
                </button>
              </div>

              {/* Prize List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {catalogData.map(prize => (
                  <div 
                    key={prize.id} 
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{prize.icon}</span>
                        <h3 className="font-bold text-slate-800 leading-tight">{prize.name}</h3>
                      </div>
                      <button
                        onClick={() => handleDeletePrize(prize.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2 shrink-0"
                        title="Eliminar Premio"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-4 text-indigo-600 font-bold bg-indigo-50 inline-block px-3 py-1 rounded-md self-start">
                      {prize.pointsCost} <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">pts</span>
                    </div>
                  </div>
                ))}
                
                {catalogData.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-white rounded-xl border border-dashed border-slate-300">
                    Aún no hay premios en el catálogo.<br />Agrega uno desde el formulario de arriba.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Promotions Modal */}
      {isPromotionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Multiplicadores y Promociones</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Crea reglas para otorgar más puntos por productos específicos o en días clave.
                </p>
              </div>
              <button 
                onClick={() => setIsPromotionsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              {/* Add New Promotion Form */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm text-slate-800">Nueva Promoción</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={newPromoName} 
                      onChange={(e) => setNewPromoName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Ej. Finde de Cervezas..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Multiplicador</label>
                    <select 
                      value={newPromoMultiplier} 
                      onChange={(e) => setNewPromoMultiplier(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="2">Doble (2x)</option>
                      <option value="3">Triple (3x)</option>
                      <option value="4">Cuádruple (4x)</option>
                      <option value="5">Quíntuple (5x)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Producto / Categoría</label>
                    <input 
                      type="text" 
                      value={newPromoTarget} 
                      onChange={(e) => setNewPromoTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Todos o Producto específico..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Inicio</label>
                    <input 
                      type="date" 
                      value={newPromoStart} 
                      onChange={(e) => setNewPromoStart(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Fin</label>
                    <input 
                      type="date" 
                      value={newPromoEnd} 
                      onChange={(e) => setNewPromoEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={handleAddPromotion}
                    disabled={!newPromoName || !newPromoTarget || !newPromoStart || !newPromoEnd}
                    className="px-5 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors tracking-wide h-[42px]"
                  >
                    Crear Promoción
                  </button>
                </div>
              </div>

              {/* Promotions List */}
              <div className="space-y-3">
                {promotionsData.map(promo => (
                  <div 
                    key={promo.id} 
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 font-black text-xl rounded-xl flex items-center justify-center shrink-0">
                        {promo.multiplier}x
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800">{promo.name}</h3>
                          {!promo.isActive && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-full border border-slate-200">Inactiva</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">Aplica a: <span className="text-slate-700">{promo.target}</span></p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 md:ml-auto">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vigencia</p>
                        <p className="text-sm font-medium text-slate-700">{promo.startDate} al {promo.endDate}</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200 mx-2 hidden md:block"></div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePromotionStatus(promo.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                            promo.isActive 
                              ? "bg-white border-amber-200 text-amber-600 hover:bg-amber-50" 
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          {promo.isActive ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDeletePromotion(promo.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 border border-transparent"
                          title="Eliminar Promoción"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {promotionsData.length === 0 && (
                  <div className="py-12 text-center text-slate-500 font-medium bg-white rounded-xl border border-dashed border-slate-300">
                    Aún no hay promociones activas.<br />Crea una desde el formulario de arriba.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
