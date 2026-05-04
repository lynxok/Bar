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
  Zap,
  Check,
  ChevronDown
} from "lucide-react";
import { cn } from "../lib/utils";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from "./Inventory";

interface Transaction {
  id: string;
  date: string;
  type: 'purchase' | 'redemption' | 'adjustment';
  description: string;
  amount: number;
}

const INITIAL_CUSTOMERS = [
  { 
    id: "C-0842", 
    name: "María González", 
    email: "maria.g@example.com", 
    phone: "+54 11 4321-8842", 
    points: 1450, 
    tier: "Gold", 
    returnRate: "Alta", 
    lastVisit: "Hace 2 días",
    history: [
      { id: 't1', date: '2026-05-02', type: 'purchase', description: 'Compra en local', amount: 450 },
      { id: 't2', date: '2026-05-01', type: 'redemption', description: 'Postre de Cortesía', amount: -200 },
      { id: 't3', date: '2026-04-28', type: 'purchase', description: 'Compra en local', amount: 1200 },
    ]
  },
  { 
    id: "C-0931", 
    name: "Ana Martínez", 
    email: "ana.martinez@example.com", 
    phone: "+54 11 2234-5511", 
    points: 3400, 
    tier: "Platinum", 
    returnRate: "Muy Alta", 
    lastVisit: "Ayer",
    history: [
      { id: 't4', date: '2026-05-03', type: 'redemption', description: 'Descuento 15% Mesa', amount: -500 },
      { id: 't5', date: '2026-05-01', type: 'purchase', description: 'Cena Lounge', amount: 3900 },
    ]
  },
  { 
    id: "C-0715", 
    name: "Carlos Ruiz", 
    email: "cruiz_89@example.com", 
    phone: "+54 11 5521-9931", 
    points: 280, 
    tier: "Silver", 
    returnRate: "Media", 
    lastVisit: "Hace 1 semana",
    history: [
      { id: 't6', date: '2026-04-25', type: 'purchase', description: 'Almuerzo Ejecutivo', amount: 280 },
    ]
  },
  { 
    id: "C-0888", 
    name: "Lucía Silva", 
    email: "lucia.silva@example.com", 
    phone: "+54 11 9911-2244", 
    points: 890, 
    tier: "Silver", 
    returnRate: "Alta", 
    lastVisit: "Hace 5 días",
    history: [
      { id: 't7', date: '2026-04-30', type: 'purchase', description: 'Cena Tapas', amount: 890 },
    ]
  },
  { 
    id: "C-1102", 
    name: "Diego Fernández", 
    email: "dfernandez@example.com", 
    phone: "+54 11 8842-1123", 
    points: 120, 
    tier: "Bronze", 
    returnRate: "Baja", 
    lastVisit: "Hace 3 semanas",
    history: [
      { id: 't8', date: '2026-04-12', type: 'adjustment', description: 'Corrección manual', amount: 120 },
    ]
  },
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

const INITIAL_TIERS = [
  { name: 'Bronze', minPoints: 0, color: 'orange' },
  { name: 'Silver', minPoints: 500, color: 'slate' },
  { name: 'Gold', minPoints: 1500, color: 'amber' },
  { name: 'Platinum', minPoints: 3500, color: 'indigo' },
];

const getTierStyle = (tierName: string, index: number = 0) => {
  const name = tierName.toLowerCase();
  
  if (name.includes('platinum')) return 'bg-slate-900 border-slate-700 text-slate-100 shadow-sm';
  if (name.includes('gold')) return 'bg-amber-100 border-amber-200 text-amber-800';
  if (name.includes('silver')) return 'bg-slate-100 border-slate-200 text-slate-700';
  if (name.includes('bronze')) return 'bg-orange-50 border-orange-100 text-orange-800';
  
  // Fallback cyclic styles
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
  const [customersData, setCustomersData] = React.useState(INITIAL_CUSTOMERS);
  const [redemptionsData, setRedemptionsData] = React.useState(INITIAL_REDEMPTIONS);
  const [catalogData, setCatalogData] = React.useState(INITIAL_CATALOG);
  const [promotionsData, setPromotionsData] = React.useState(INITIAL_PROMOTIONS);
  const [tierConfig, setTierConfig] = React.useState(INITIAL_TIERS);
  const [isTiersModalOpen, setIsTiersModalOpen] = React.useState(false);
  const [redeemingCustomer, setRedeemingCustomer] = React.useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
  const [profileTab, setProfileTab] = React.useState<'info' | 'history'>('info');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = React.useState(false);
  const [isPromotionsModalOpen, setIsPromotionsModalOpen] = React.useState(false);
  const [scanQuery, setScanQuery] = React.useState('');
  
  // Catalog Form
  const [newPrizeName, setNewPrizeName] = React.useState('');
  const [newPrizePoints, setNewPrizePoints] = React.useState('');
  const [newPrizeIcon, setNewPrizeIcon] = React.useState('🎁');

  // Promotions Form
  const [newPromoName, setNewPromoName] = React.useState('');
  const [newPromoMultiplier, setNewPromoMultiplier] = React.useState('2');
  const [selectedTargets, setSelectedTargets] = React.useState<string[]>([]);
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = React.useState(false);
  const [targetSearch, setTargetSearch] = React.useState('');
  const [newPromoStart, setNewPromoStart] = React.useState('');
  const [newPromoEnd, setNewPromoEnd] = React.useState('');

  const toggleTarget = (target: string) => {
    setSelectedTargets(prev => 
      prev.includes(target) 
        ? prev.filter(t => t !== target) 
        : [...prev, target]
    );
  };

  const [pointValue, setPointValue] = React.useState(0.005);
  const [isEditingPointValue, setIsEditingPointValue] = React.useState(false);
  
  const handleRedeem = (prize: any) => {
    if (!redeemingCustomer || redeemingCustomer.points < prize.pointsCost) return;

    // Deduct points and update history
    setCustomersData(prev => prev.map(c => 
      c.id === redeemingCustomer.id 
        ? { 
            ...c, 
            points: c.points - prize.pointsCost,
            history: [
              { 
                id: 't' + Date.now(), 
                date: new Date().toISOString().split('T')[0], 
                type: 'redemption', 
                description: `Canje: ${prize.name}`, 
                amount: -prize.pointsCost 
              },
              ...(c.history || [])
            ]
          } 
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
    if (!newPromoName || selectedTargets.length === 0 || !newPromoStart || !newPromoEnd) return;
    const newPromo = {
      id: 'prom' + Date.now(),
      name: newPromoName,
      multiplier: parseInt(newPromoMultiplier, 10),
      target: selectedTargets.join(', '),
      startDate: newPromoStart,
      endDate: newPromoEnd,
      isActive: true
    };
    setPromotionsData([...promotionsData, newPromo]);
    setNewPromoName('');
    setNewPromoMultiplier('2');
    setSelectedTargets([]);
    setNewPromoStart('');
    setNewPromoEnd('');
  };

  const handleDeletePromotion = (id: string) => {
    setPromotionsData(promotionsData.filter(p => p.id !== id));
  };

  const handleUpdateTierName = (index: number, newName: string) => {
    setTierConfig(prev => prev.map((t, i) => i === index ? { ...t, name: newName } : t));
  };

  const handleAddTier = () => {
    const lastTier = tierConfig[tierConfig.length - 1];
    const newTier = {
      name: 'Nuevo Nivel',
      minPoints: lastTier ? lastTier.minPoints + 1000 : 0,
      color: 'slate'
    };
    setTierConfig([...tierConfig, newTier]);
  };

  const handleRemoveTier = (index: number) => {
    if (tierConfig.length <= 1) return; // Must have at least one level
    setTierConfig(tierConfig.filter((_, i) => i !== index));
  };

  const calculateTier = (points: number) => {
    const sortedTiers = [...tierConfig].sort((a, b) => b.minPoints - a.minPoints);
    const tier = sortedTiers.find(t => points >= t.minPoints);
    return tier ? tier.name : (tierConfig[0]?.name || 'Base');
  };

  const handleUpdateTierThreshold = (index: number, value: number) => {
    setTierConfig(prev => prev.map((t, i) => i === index ? { ...t, minPoints: value } : t));
  };

  const handleScan = () => {
    if (!scanQuery) return;
    
    // Find customer by ID, email or phone
    const customer = customersData.find(c => 
      c.id.toLowerCase().includes(scanQuery.toLowerCase()) || 
      c.email.toLowerCase().includes(scanQuery.toLowerCase()) ||
      c.phone.includes(scanQuery)
    );

    if (customer) {
      const pointsToAdd = 100; // Mock amount for example
      setCustomersData(prev => prev.map(c => 
        c.id === customer.id 
          ? { 
              ...c, 
              points: c.points + pointsToAdd,
              history: [
                { 
                  id: 't' + Date.now(), 
                  date: new Date().toISOString().split('T')[0], 
                  type: 'purchase', 
                  description: 'Puntos por compra (Escáner)', 
                  amount: pointsToAdd 
                },
                ...(c.history || [])
              ]
            } 
          : c
      ));
      setScanQuery('');
      alert(`Se agregaron ${pointsToAdd} puntos a ${customer.name}`);
    } else {
      alert('Cliente no encontrado');
    }
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
                      {(() => {
                        const tierName = calculateTier(c.points);
                        const tierIdx = tierConfig.findIndex(t => t.name === tierName);
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
                      title="Eliminar nivel"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          {/* ... existing promotions modal content ... */}
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
                  <p className="text-sm text-slate-500 font-medium">Cliente ID: {selectedCustomer.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
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
                        const tierIdx = tierConfig.findIndex(t => t.name === tierName);
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
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                       Detalles de Contacto
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                        <span className="text-xs font-medium text-slate-500">Email</span>
                        <span className="text-sm font-bold text-slate-700">{selectedCustomer.email}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                        <span className="text-xs font-medium text-slate-500">Teléfono</span>
                        <span className="text-sm font-bold text-slate-700">{selectedCustomer.phone}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                        <span className="text-xs font-medium text-slate-500">Última Visita</span>
                        <span className="text-sm font-bold text-slate-700">{selectedCustomer.lastVisit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-800">Transacciones Recientes</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
                      Total: {selectedCustomer.history?.length || 0}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedCustomer.history?.map((tx: any) => (
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
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{tx.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-sm font-bold",
                            tx.amount > 0 ? "text-emerald-600" : "text-red-500"
                          )}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount} pts
                          </span>
                        </div>
                      </div>
                    ))}
                    {!selectedCustomer.history?.length && (
                      <div className="py-12 text-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No hay transacciones registradas.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors">
                Editar Datos
              </button>
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
    </div>
  );
}
