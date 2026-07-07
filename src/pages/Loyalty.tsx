import React, { useMemo, useState, useRef, useEffect } from "react";
import { db } from "../db/database";
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
  X,
  Settings,
  Edit2,
  Zap,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Upload
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from "../lib/utils";
import { useStore } from "../contexts/StoreContext";
import { INITIAL_CATEGORIES } from "./Inventory";

const getTierStyle = (tierName: string, index: number = 0) => {
  const name = tierName.toLowerCase();
  if (name.includes('platinum')) return 'bg-slate-900 border-slate-700 text-slate-100 shadow-sm';
  if (name.includes('gold')) return 'bg-amber-100 border-amber-200 text-amber-800';
  if (name.includes('silver')) return 'bg-slate-100 border-slate-200 text-slate-700';
  if (name.includes('bronze')) return 'bg-orange-50 border-orange-100 text-orange-800';

  const styles = [
    'bg-orange-50 border-orange-100 text-orange-800',
    'bg-slate-100 border-slate-200 text-slate-700',
    'bg-amber-100 border-amber-200 text-amber-800',
    'bg-indigo-50 border-indigo-200 text-indigo-700',
    'bg-emerald-50 border-emerald-200 text-emerald-700',
  ];
  return styles[index % styles.length];
};

export function Loyalty() {
  const {
    orders,
    customers: customersData,
    rewards: catalogData,
    addCustomer,
    redeemPoints,
    updateCustomerPoints,
    loyaltyConfig,
    loyaltyTransactions,
    updateLoyaltyConfig
  } = useStore();

  const [isTiersModalOpen, setIsTiersModalOpen] = useState(false);
  const [redeemingCustomer, setRedeemingCustomer] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<'info' | 'history'>('info');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isPromotionsModalOpen, setIsPromotionsModalOpen] = useState(false);
  const [scanQuery, setScanQuery] = useState('');
  
  // Catalog Form
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newPrizePoints, setNewPrizePoints] = useState('');
  const [newPrizeIcon, setNewPrizeIcon] = useState('🎁');
  const [newPrizeImage, setNewPrizeImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPrizeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Promotions Form
  const [newPromoName, setNewPromoName] = useState('');
  const [newPromoMultiplier, setNewPromoMultiplier] = useState('2');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [newPromoStart, setNewPromoStart] = useState('');
  const [newPromoEnd, setNewPromoEnd] = useState('');

  const [isEditingPointValue, setIsEditingPointValue] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    id: '', // DNI/Member Number
    tier: 'Bronze',
    points: 0,
  });

  // Extract variables from Dexie loyaltyConfig state
  const pointValue = loyaltyConfig?.pointValue ?? 0.005;
  const tierConfig = loyaltyConfig?.tierConfig ?? [];
  const promotionsData = loyaltyConfig?.promotions ?? [];

  const chartData = useMemo(() => {
    const last5Days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i));
      return d.toISOString().split('T')[0];
    });

    return last5Days.map(date => {
      const dayOrders = orders.filter(o => o.timestamp && o.timestamp.startsWith(date));
      const totalSales = dayOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      let points = Math.floor(totalSales / 100);
      
      const maxMultiplier = promotionsData
        .filter(p => p.active)
        .reduce((max, p) => Math.max(max, p.multiplier), 1);
        
      return {
        name: new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' }),
        val: points * maxMultiplier,
        original: points
      };
    });
  }, [orders, promotionsData]);
  
  const handleRedeem = async (prize: any) => {
    if (!redeemingCustomer || redeemingCustomer.points < prize.pointsCost) return;
    try {
      await redeemPoints(redeemingCustomer.dni, prize.pointsCost, `Canje de Premio: ${prize.name}`);
      setRedeemingCustomer(null);
      alert("Canje realizado con éxito");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPrize = async () => {
    if (!newPrizeName || !newPrizePoints) return;
    await db.rewards.add({
      name: newPrizeName,
      pointsCost: parseInt(newPrizePoints, 10)
    });
    setNewPrizeName('');
    setNewPrizePoints('');
    setNewPrizeIcon('🎁');
    setNewPrizeImage(null);
  };

  const handleDeletePrize = async (id: number) => {
    await db.rewards.delete(id);
  };

  const handleAddPromotion = async () => {
    if (!newPromoName || !newPromoStart || !newPromoEnd) return;
    const newPromo = {
      id: 'prom' + Date.now(),
      name: newPromoName,
      multiplier: parseFloat(newPromoMultiplier),
      targets: selectedTargets.length > 0 ? selectedTargets : ['Todas'],
      startDate: newPromoStart,
      endDate: newPromoEnd,
      active: true
    };
    await updateLoyaltyConfig({
      promotions: [...promotionsData, newPromo]
    });
    setNewPromoName('');
    setNewPromoMultiplier('2');
    setSelectedTargets([]);
    setNewPromoStart('');
    setNewPromoEnd('');
  };

  const handleDeletePromotion = async (id: string) => {
    await updateLoyaltyConfig({
      promotions: promotionsData.filter(p => p.id !== id)
    });
  };

  const handleUpdateTierName = async (index: number, newName: string) => {
    const updated = tierConfig.map((t, i) => i === index ? { ...t, name: newName } : t);
    await updateLoyaltyConfig({ tierConfig: updated });
  };

  const handleAddTier = async () => {
    const lastTier = tierConfig[tierConfig.length - 1];
    const newTier = {
      name: 'Nuevo Nivel',
      minPoints: lastTier ? lastTier.minPoints + 1000 : 0,
      color: 'slate'
    };
    await updateLoyaltyConfig({
      tierConfig: [...tierConfig, newTier]
    });
  };

  const handleRemoveTier = async (index: number) => {
    if (tierConfig.length <= 1) return;
    await updateLoyaltyConfig({
      tierConfig: tierConfig.filter((_, i) => i !== index)
    });
  };

  const calculateTier = (points: number) => {
    const sortedTiers = [...tierConfig].sort((a, b) => b.minPoints - a.minPoints);
    const tier = sortedTiers.find(t => points >= t.minPoints);
    return tier ? tier.name : (tierConfig[0]?.name || 'Base');
  };

  const handleUpdateTierThreshold = async (index: number, value: number) => {
    const updated = tierConfig.map((t, i) => i === index ? { ...t, minPoints: value } : t);
    await updateLoyaltyConfig({ tierConfig: updated });
  };

  const handleScan = async () => {
    if (!scanQuery) return;
    const customer = customersData.find(c => c.dni === scanQuery || c.id?.toString() === scanQuery);
    if (customer) {
      const pointsToAdd = 100;
      await updateCustomerPoints(customer.dni, pointsToAdd, "Ajuste / Check-in de Escáner");
      setScanQuery('');
      alert(`Se agregaron ${pointsToAdd} puntos a ${customer.name}`);
    } else {
      alert('Cliente no encontrado');
    }
  };

  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    return loyaltyTransactions.filter(t => t.customerDni === selectedCustomer.dni);
  }, [selectedCustomer, loyaltyTransactions]);

  const [searchQuery, setSearchQuery] = useState('');
  const filteredCustomers = useMemo(() => {
    return customersData.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dni.includes(searchQuery) ||
      (c.phone && c.phone.includes(searchQuery))
    );
  }, [customersData, searchQuery]);

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
            onClick={() => setIsTiersModalOpen(true)}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center gap-2 font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors uppercase tracking-wider"
          >
            <Award className="w-4 h-4 text-indigo-500" /> Configurar Niveles
          </button>
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
          <button 
            onClick={() => setIsNewCustomerModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Clientes Activos</div>
            <div className="text-3xl font-bold text-slate-900">{customersData.length.toLocaleString()}</div>
            <div className="text-emerald-500 text-xs font-medium mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sincronizado
            </div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Puntos Emitidos</div>
            <div className="text-3xl font-bold text-slate-900">
              {customersData.reduce((acc, c) => acc + (c.points || 0), 0).toLocaleString()}
            </div>
            <div className="text-slate-400 text-xs mt-2 flex items-center font-medium">
              <Award className="h-3 w-3 mr-1" />
              Equivalente a ${(customersData.reduce((acc, c) => acc + (c.points || 0), 0) * pointValue).toLocaleString('es-AR', {minimumFractionDigits: 2})}
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
                    onChange={(e) => updateLoyaltyConfig({ pointValue: Number(e.target.value) })}
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
            <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Canjes Realizados</div>
            <div className="text-3xl font-bold text-white">
              {loyaltyTransactions.filter(t => t.type === 'redemption').length}
            </div>
            <div className="text-emerald-400 text-[11px] mt-2 flex items-center font-medium">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sincronizado en DB
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
                    placeholder="Buscar por DNI, nombre o teléfono..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
             </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nivel</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Puntos Acumulados</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {c.name.split(' ').map((n: string) => n[0]).join('')}
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
                      {(() => {
                        const tierName = calculateTier(c.points);
                        const tierIdx = tierConfig.findIndex((t: any) => t.name === tierName);
                        return (
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                            getTierStyle(tierName, tierIdx >= 0 ? tierIdx : 0)
                          )}>
                            {tierName}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-800">{c.points.toLocaleString()} pts</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          className="px-4 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors border border-emerald-200"
                          onClick={() => setRedeemingCustomer(c)}
                        >
                          Canjear
                        </button>
                        <button 
                          className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setProfileTab('info');
                          }}
                        >
                          Perfil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm bg-slate-50">
            <span className="text-slate-500 font-medium">Mostrando {filteredCustomers.length} clientes</span>
          </div>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Quick Scanner Check-in */}
          <div className="bg-indigo-600 rounded-2xl shadow-lg border border-indigo-500 p-6 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-white text-lg mb-2">Escáner de Cliente</h3>
              <p className="text-indigo-200 text-xs mb-6 max-w-[80%]">Ingresa el ID o DNI para sumar puntos a un cliente.</p>
              
              <div className="flex gap-2 relative">
                <input 
                  id="global-scanner-focus"
                  type="text" 
                  placeholder="Ej: 20.456.789..." 
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  className="w-full bg-white/10 border border-indigo-400 text-white placeholder:text-indigo-300 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-white transition-all text-sm font-medium"
                />
                <button 
                  onClick={handleScan}
                  className="bg-white text-indigo-600 px-4 py-3 rounded-xl font-bold shadow-md hover:bg-slate-50 transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
            <Award className="absolute -right-6 -bottom-6 w-40 h-40 text-white opacity-5 pointer-events-none" />
          </div>

          {/* Recent Transactions list */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-6">Últimos Movimientos</h3>
            <div className="space-y-4">
              {loyaltyTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 group">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    tx.type === 'purchase' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                    tx.type === 'redemption' ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-blue-50 border-blue-100 text-blue-600"
                  )}>
                    {tx.type === 'purchase' ? <Plus className="w-5 h-5" /> : 
                     tx.type === 'redemption' ? <Gift className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{tx.customerName}</p>
                    <p className="text-xs text-slate-500 truncate">{tx.description}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className={cn(
                      "text-sm font-black",
                      tx.points > 0 ? "text-emerald-600" : "text-rose-500"
                    )}>
                      {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {loyaltyTransactions.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-6">Sin movimientos recientes.</p>
              )}
            </div>
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
                        <span className="text-2xl">{prize.icon || '🎁'}</span>
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
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex gap-6 items-start">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden shrink-0 group"
                  >
                    {newPrizeImage ? (
                      <img src={newPrizeImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-6 h-6 text-slate-300 group-hover:text-indigo-400 mx-auto mb-2" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-500">Subir Imagen</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      className="hidden" 
                      accept="image/*" 
                    />
                  </div>

                  <div className="flex-1 grid grid-cols-12 gap-4">
                    <div className="col-span-8">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Premio</label>
                      <input 
                        type="text" 
                        value={newPrizeName} 
                        onChange={(e) => setNewPrizeName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Ej. Postre Helado, Cena para 2..."
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Puntos</label>
                      <input 
                        type="number" 
                        value={newPrizePoints} 
                        onChange={(e) => setNewPrizePoints(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="200"
                      />
                    </div>
                    <div className="col-span-12 flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emoji Alternativo:</label>
                        <input 
                          type="text" 
                          value={newPrizeIcon} 
                          onChange={(e) => setNewPrizeIcon(e.target.value)}
                          className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                        />
                      </div>
                      <button 
                        onClick={handleAddPrize}
                        disabled={!newPrizeName || !newPrizePoints}
                        className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Guardar en Catálogo
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {catalogData.map(prize => (
                  <div 
                    key={prize.id} 
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-indigo-300 transition-all"
                  >
                    <div className="h-32 bg-slate-100 relative overflow-hidden">
                      {prize.image ? (
                        <img src={prize.image} alt={prize.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-50">
                          {prize.icon || '🎁'}
                        </div>
                      )}
                      <button
                        onClick={() => handleDeletePrize(prize.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-500 rounded-lg transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-800 leading-tight mb-2">{prize.name}</h3>
                      <div className="flex items-center justify-between">
                        <div className="text-indigo-600 font-bold bg-indigo-50 inline-block px-2.5 py-1 rounded-lg text-sm">
                          {prize.pointsCost} <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tiers Configuration Modal */}
      {isTiersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Niveles de Fidelización</h2>
                <p className="text-sm text-slate-500 mt-1">Personaliza los nombres y umbrales de puntos.</p>
              </div>
              <button 
                onClick={() => setIsTiersModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto bg-slate-50">
              {tierConfig.map((tier, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center border shrink-0",
                      getTierStyle(tier.name, idx)
                    )}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={tier.name}
                        onChange={(e) => handleUpdateTierName(idx, e.target.value)}
                        className="w-full bg-transparent font-bold text-slate-800 outline-none focus:bg-slate-50 rounded px-1 -ml-1 border border-transparent focus:border-slate-200"
                        placeholder="Nombre del nivel"
                      />
                    </div>
                    <button 
                      onClick={() => handleRemoveTier(idx)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Puntos Requeridos
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0"
                          value={tier.minPoints}
                          onChange={(e) => handleUpdateTierThreshold(idx, Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-400 uppercase">pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={handleAddTier}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-xs uppercase tracking-wider hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Agregar Nuevo Nivel
              </button>
            </div>
            
            <div className="p-6 bg-white border-t border-slate-100">
              <button 
                onClick={() => setIsTiersModalOpen(false)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 text-sm uppercase tracking-wide"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotions Modal */}
      {isPromotionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Centro de Promociones</h2>
                  <p className="text-sm text-slate-500 font-medium">Configura multiplicadores de puntos y eventos especiales.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPromotionsModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 shadow-sm border border-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-500" /> Nueva Promoción
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre de la Campaña</label>
                        <input 
                          type="text" 
                          value={newPromoName}
                          onChange={(e) => setNewPromoName(e.target.value)}
                          placeholder="Ej: Happy Hour 2x1"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Multiplicador</label>
                          <select 
                            value={newPromoMultiplier}
                            onChange={(e) => setNewPromoMultiplier(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="1.5">1.5x</option>
                            <option value="2">2.0x</option>
                            <option value="3">3.0x</option>
                            <option value="5">5.0x</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Categoría</label>
                          <select 
                            onChange={(e) => setSelectedTargets([e.target.value])}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="Todas">Todas</option>
                            <option value="Cafetería">Cafetería</option>
                            <option value="Cervezas">Cervezas</option>
                            <option value="Cocina">Cocina</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Inicio</label>
                          <input 
                            type="date" 
                            value={newPromoStart}
                            onChange={(e) => setNewPromoStart(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fin</label>
                          <input 
                            type="date" 
                            value={newPromoEnd}
                            onChange={(e) => setNewPromoEnd(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none" 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleAddPromotion}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                      >
                        Activar Promoción
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Impacto Estimado</h4>
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <Bar dataKey="val" fill="#6366f1" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.val > entry.original ? '#f59e0b' : '#6366f1'} />
                            ))}
                          </Bar>
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-indigo-400 font-medium text-center mt-2 italic">Proyección de puntos emitidos con promos activas.</p>
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" /> Promociones Activas
                  </h3>
                  <div className="space-y-4 flex-1">
                    {promotionsData.map((promo) => (
                      <div key={promo.id} className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 transition-all group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                              {promo.multiplier}x
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">{promo.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{promo.targets.join(', ')}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeletePromotion(promo.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold relative z-10">
                          <div className="flex items-center gap-4">
                            <span className="text-slate-400 uppercase tracking-widest">Validez:</span>
                            <span className="text-slate-600">{promo.startDate} al {promo.endDate}</span>
                          </div>
                          <span className="flex items-center gap-1.5 text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Activa
                          </span>
                        </div>
                        <span className="absolute -right-2 -bottom-4 text-6xl font-black text-slate-50 pointer-events-none group-hover:text-indigo-50 transition-colors">
                          {promo.multiplier}X
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-100">
                  {selectedCustomer.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedCustomer.name}</h2>
                  <p className="text-sm text-slate-500 font-medium">Cliente DNI: {selectedCustomer.dni}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-100 p-1 bg-slate-50/50">
              <button 
                onClick={() => setProfileTab('info')}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  profileTab === 'info' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Información
              </button>
              <button 
                onClick={() => setProfileTab('history')}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
                  profileTab === 'history' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <History className="w-3.5 h-3.5" /> Historial de Puntos
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {profileTab === 'info' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nivel Actual</p>
                      {(() => {
                        const tierName = calculateTier(selectedCustomer.points);
                        const tierIdx = tierConfig.findIndex((t: any) => t.name === tierName);
                        return (
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border",
                            getTierStyle(tierName, tierIdx >= 0 ? tierIdx : 0)
                          )}>
                            {tierName}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Balance Total</p>
                      <p className="text-xl font-bold text-indigo-700">{selectedCustomer.points.toLocaleString()} pts</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Detalles de Contacto</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                        <span className="text-xs font-medium text-slate-500">Email</span>
                        <span className="text-sm font-bold text-slate-700">{selectedCustomer.email}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                        <span className="text-xs font-medium text-slate-500">Teléfono</span>
                        <span className="text-sm font-bold text-slate-700">{selectedCustomer.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-800">Transacciones Recientes</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
                      Total: {customerTransactions.length}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {customerTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                            tx.type === 'purchase' ? "bg-emerald-50 text-emerald-600" : 
                            tx.type === 'redemption' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {tx.type === 'purchase' ? <Plus className="w-4 h-4" /> : 
                             tx.type === 'redemption' ? <Gift className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{tx.description}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                              {new Date(tx.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-sm font-bold",
                            tx.points > 0 ? "text-emerald-600" : "text-red-500"
                          )}>
                            {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                          </span>
                        </div>
                      </div>
                    ))}
                    {customerTransactions.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-6">Sin movimientos registrados.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => {
                  setRedeemingCustomer(selectedCustomer);
                  setSelectedCustomer(null);
                }}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
              >
                Canjear Puntos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-xl text-slate-900">Registrar Nuevo Socio</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Módulo de Fidelización LYNX</p>
              </div>
              <button onClick={() => setIsNewCustomerModalOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:text-rose-500 rounded-full transition-all shadow-sm border border-transparent hover:border-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await addCustomer({ ...newCustomer, dni: newCustomer.id });
                setIsNewCustomerModalOpen(false);
                setNewCustomer({ name: '', email: '', phone: '', id: '', tier: 'Bronze', points: 0 });
              } catch (err: any) {
                alert(err.message);
              }
            }} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  required
                  type="text" 
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / N° Socio</label>
                  <input 
                    required
                    type="text" 
                    value={newCustomer.id}
                    onChange={e => setNewCustomer({...newCustomer, id: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="20456789"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                  <input 
                    required
                    type="tel" 
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="3511234567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <input 
                  required
                  type="email" 
                  value={newCustomer.email}
                  onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="flex-1 h-14 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-[2] h-14 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
