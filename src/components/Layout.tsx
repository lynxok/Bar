import { Outlet, Link, useLocation } from "react-router-dom";
import { isLowStock, readLowStockThreshold } from '../lib/stock';
import { logout, getStoredUser, isSuperadminRole, isAdminRole } from '../lib/auth';
import { useBusiness } from "../contexts/BusinessContext";
import { NotificationService } from "../lib/NotificationService";
import { useEffect, useState, useMemo } from "react";
import {
  LayoutDashboard,
  Grid,
  MonitorCheck,
  Package,
  Wallet,
  Banknote,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Settings,
  Utensils,
  BarChart,
  Award,
  Beer,
  Sun,
  Moon,
  ShieldAlert,
  ChefHat,
  FileText,
  Terminal,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ChatWidget } from "./ChatWidget";
import { NotificationsPanel } from "./NotificationsPanel";
import { useStore } from "../contexts/StoreContext";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { MagneticDock } from "./MagneticDock";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  time: string;
  read: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: any;
}

interface NavGroup {
  group: 'Operación' | 'Gestión' | 'Sistema';
  items: NavItem[];
}


export function Layout() {
  const location = useLocation();
  const { businessName, logo } = useBusiness();
  const { clientOrders, approveClientOrder, rejectClientOrder, products, messages } = useStore();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const unreadChatCount = messages.filter(m => m.status === 'sent').length;
  // Alerta global de stock bajo (antes solo se actualizaba al abrir Inventario)
  const lowStockCount = products.filter(p => isLowStock(p, readLowStockThreshold())).length;
  const [prevPendingCount, setPrevPendingCount] = useState(0);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Sistema Listo',
      message: 'LYNX BarOS se ha iniciado correctamente.',
      type: 'success',
      time: 'Recién',
      read: false
    },
    {
      id: '2',
      title: 'Consejo del día',
      message: 'Puedes usar F2 para activar el escáner de códigos de barras en cualquier momento.',
      type: 'info',
      time: 'Hace 5 min',
      read: false
    }
  ]);

  // Audio and Desktop Notification on new pending QR order arrival
  useEffect(() => {
    const currentPendingCount = clientOrders.filter(co => co.status === 'pending').length;
    if (currentPendingCount > prevPendingCount) {
      if ('Notification' in window && Notification.permission === 'granted') {
        const latestOrder = clientOrders.find(co => co.status === 'pending');
        NotificationService.sendNotification('Nuevo Pedido QR', {
          body: `Mesa ${latestOrder?.tableId.replace('T-', '')} ha enviado un nuevo pedido.`
        });
      }
      
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } catch (err) {
        console.error('Audio alert failed:', err);
      }
    }
    setPrevPendingCount(currentPendingCount);
  }, [clientOrders, prevPendingCount]);

  // Sincronizar alertas de stock con notificaciones
  useEffect(() => {
    if (lowStockCount > 0) {
      const stockAlertId = `stock-alert-${lowStockCount}`;
      if (!notifications.find(n => n.id === stockAlertId)) {
        setNotifications(prev => [
          {
            id: stockAlertId,
            title: 'Alerta de Stock Bajo',
            message: `Atención: Tienes ${lowStockCount} productos con stock crítico.`,
            type: 'warning',
            time: 'Ahora',
            read: false
          },
          ...prev
        ]);
      }
    }
  }, [lowStockCount]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNotifications && !target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', next.toString());
      return next;
    });
  };

  const currentUser = getStoredUser();
  const roleName = currentUser?.role?.toLowerCase() || 'staff';
  const isSuperadmin = isSuperadminRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role) || isSuperadmin;
  const isCocinero = roleName === 'cocinero';
  const isCajero = roleName === 'cajero';

  // Navegación agrupada según manual de requerimientos y roles
  const navGroups: NavGroup[] = useMemo(() => {
    if (isCocinero) {
      return [
        {
          group: 'Operación',
          items: [
            { path: "/cocina", label: "Cocina", icon: ChefHat },
          ]
        },
        {
          group: 'Sistema',
          items: [
            { path: "/ayuda", label: "Ayuda", icon: HelpCircle }
          ]
        }
      ];
    }

    const operacion: NavItem[] = [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/mapa", label: "Mapa del Salón", icon: Grid },
      { path: "/pos", label: "Caja Rápida (POS)", icon: MonitorCheck },
      { path: "/cocina", label: "Cocina", icon: ChefHat },
      { path: "/reservas", label: "Reservas", icon: CalendarDays },
    ];

    const gestion: NavItem[] = [
      { path: "/inventario", label: "Inventario", icon: Package },
      { path: "/carta", label: "Carta QR", icon: Utensils },
      { path: "/finanzas", label: "Finanzas", icon: Wallet },
      { path: "/cierre", label: "Cierre de Caja", icon: Banknote },
      { path: "/analitica", label: "Analítica", icon: BarChart },
      { path: "/fidelizacion", label: "Fidelización", icon: Award },
      { path: "/vasos", label: "Vasos y Lockers", icon: Beer },
      { path: "/facturacion", label: "Facturación", icon: FileText },
    ];

    const sistema: NavItem[] = [
      { path: "/configuracion", label: "Configuración", icon: Settings },
    ];

    if (isAdmin) {
      sistema.push({ path: "/seguridad", label: "Auditoría", icon: ShieldAlert });
    }
    if (isSuperadmin) {
      sistema.push({ path: "/logs", label: "Registro Técnico", icon: Terminal });
    }
    sistema.push({ path: "/ayuda", label: "Ayuda", icon: HelpCircle });

    return [
      { group: 'Operación', items: operacion },
      { group: 'Gestión', items: gestion },
      { group: 'Sistema', items: sistema },
    ];
  }, [isAdmin, isSuperadmin, isCocinero]);

  const allNavItems = useMemo(() => {
    return navGroups.flatMap(g => g.items);
  }, [navGroups]);

  const currentTitle = useMemo(() => {
    if (location.pathname === '/') return 'Dashboard';
    const found = allNavItems.find(i => i.path === location.pathname);
    if (found) return found.label;
    if (location.pathname.startsWith('/cliente')) return 'Carta Digital';
    if (location.pathname === '/mozo') return 'App del Mozo';
    return 'Panel de Control';
  }, [location.pathname, allNavItems]);


  useEffect(() => {
    if (lowStockCount > 0) {
      if ('Notification' in window && Notification.permission === 'granted') {
         NotificationService.sendNotification('Alerta de Stock', {
           body: `Atención: Tenemos ${lowStockCount} alertas de stock bajo.`
         });
      }
    }
  }, [lowStockCount]);

  const handleRequestNotifications = async () => {
    const granted = await NotificationService.requestPermission();
    if (granted) {
      NotificationService.sendNotification('Notificaciones Activadas', {
        body: 'Te enviaremos alertas para cierres de caja, stock y nuevos pedidos.'
      });
      
      setNotifications(prev => [
        {
          id: Date.now().toString(),
          title: 'Notificaciones de Escritorio',
          message: 'Has activado las notificaciones de escritorio con éxito.',
          type: 'success',
          time: 'Ahora',
          read: false
        },
        ...prev
      ]);
    } else {
      console.warn('Las notificaciones fueron denegadas o no están soportadas.');
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const pendingCount = clientOrders.filter(co => co.status === 'pending').length;
  const unreadCount = notifications.filter(n => !n.read).length + pendingCount;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const scannerInput = document.getElementById('global-scanner-focus') as HTMLInputElement;
        if (scannerInput) {
          scannerInput.focus();
          scannerInput.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Efecto para controlar la auto-escala según resolución y atajos de teclado Ctrl+/Ctrl-
  useEffect(() => {
    // 1. Auto-escala inicial por resolución
    const width = window.innerWidth;
    let initialZoom = 1.0;
    if (width < 1024) {
      initialZoom = 0.8;
    } else if (width < 1200) {
      initialZoom = 0.9;
    } else if (width > 2000) {
      initialZoom = 1.15;
    }
    
    // Obtener zoom previo guardado o usar el inicial
    const storedZoom = localStorage.getItem('global_zoom');
    let currentZoom = storedZoom ? parseFloat(storedZoom) : initialZoom;
    document.body.style.zoom = currentZoom.toString();

    // 2. Escuchar atajos de teclado Ctrl + +, Ctrl + -, Ctrl + 0
    const handleZoomKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          currentZoom = Math.min(1.4, currentZoom + 0.05);
          document.body.style.zoom = currentZoom.toString();
          localStorage.setItem('global_zoom', currentZoom.toString());
        } else if (e.key === '-') {
          e.preventDefault();
          currentZoom = Math.max(0.7, currentZoom - 0.05);
          document.body.style.zoom = currentZoom.toString();
          localStorage.setItem('global_zoom', currentZoom.toString());
        } else if (e.key === '0') {
          e.preventDefault();
          currentZoom = initialZoom;
          document.body.style.zoom = currentZoom.toString();
          localStorage.setItem('global_zoom', currentZoom.toString());
        }
      }
    };

    window.addEventListener('keydown', handleZoomKeyDown);
    return () => window.removeEventListener('keydown', handleZoomKeyDown);
  }, []);

  const userStr = localStorage.getItem('bar_user');
  let isWaiter = false;
  try {
    if (userStr) {
      const u = JSON.parse(userStr);
      isWaiter = u.role?.toLowerCase() === 'mozo';
    }
  } catch {}

  const isMozoRoute = location.pathname === '/mozo' || isWaiter;

  if (isMozoRoute) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased overflow-x-hidden flex">
      {/* Sidebar (Soporte Colapsable) */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-[#1E4437] hidden md:flex flex-col text-slate-300 shadow-xl z-50 transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="p-5 flex items-center gap-3 overflow-hidden border-b border-white/10">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            {isSidebarCollapsed ? (
              <img
                src="./brand/isologo-light.png"
                alt="LYNX"
                className="h-10 w-10 object-contain rounded-lg"
              />
            ) : (
              <img
                src="./brand/logo-full-dark.png"
                alt="LYNX BarOS"
                className="h-11 w-auto object-contain min-w-[140px] max-w-[180px]"
              />
            )}
          </Link>
        </div>
        
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-300/60 uppercase">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center px-3.5 py-2.5 rounded-xl gap-3 transition-all min-h-[44px]",
                      isActive
                        ? "bg-[#0F6B41] text-white shadow-sm font-semibold"
                        : "text-slate-300 hover:bg-white/5 hover:text-white font-medium",
                      isSidebarCollapsed ? "justify-center px-2" : ""
                    )}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-emerald-400/80")} />
                    {!isSidebarCollapsed && (
                      <span className="text-sm truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F6B41] flex items-center justify-center font-bold text-white uppercase flex-shrink-0">
                {(() => {
                  try {
                    const u = getStoredUser();
                    return (u?.name || 'U').substring(0, 2);
                  } catch { return 'U'; }
                })()}
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden animate-in fade-in duration-300">
                  <div className="text-sm font-semibold text-white truncate w-24">
                    {currentUser?.name || 'Usuario'}
                  </div>
                  <div className="text-xs text-emerald-300/80 truncate font-medium">
                    {currentUser?.role || 'Staff'}
                  </div>
                </div>
              )}
            </div>
            
            {!isSidebarCollapsed && (
              <button 
                onClick={() => {
                  void logout().finally(() => window.location.reload());
                }}
                className="p-2 text-slate-300 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Agency Footer */}
          {!isSidebarCollapsed && (
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
              <span className="text-[11px] text-slate-300 font-semibold tracking-wide">
                LYNX BarOS by LYNX Consulting
              </span>
              <span className="text-[10px] text-emerald-400/70 font-semibold">
                v1.2.0 (Local-First)
              </span>
            </div>
          )}

        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ml-0 bg-[#F9F9F8] dark:bg-[#121E19]",
        isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-[#1E4437] border-b border-slate-200 dark:border-white/10 flex items-center px-4 md:px-8 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 rounded-lg transition-all hidden md:block min-h-[44px] min-w-[44px] cursor-pointer"
              title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-200">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h2 className="text-lg font-bold text-[#1C1C1C] dark:text-white hidden md:block tracking-tight">
              {currentTitle}
            </h2>
            <div className="flex items-center gap-2 md:hidden">
              {logo ? (
                <img src={logo} alt="Logo" className="w-7 h-7 object-cover rounded-lg" />
              ) : (
                <Utensils className="h-5 w-5 text-[#0F6B41]" />
              )}
              <span className="font-bold text-[#1C1C1C] dark:text-white text-base tracking-tight leading-none truncate max-w-[160px]">{businessName}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <SyncStatusBadge />
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Cambiar tema"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {lowStockCount} {lowStockCount === 1 ? 'Alerta' : 'Alertas'} de Stock
              </div>
            )}
            {/* Chat Trigger Icon in Header */}
            <div className="relative">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={cn(
                  "relative p-2 rounded-full transition-all duration-300 cursor-pointer",
                  isChatOpen ? "bg-[#E7F3EC] text-[#0F6B41] dark:bg-white/10 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10"
                )}
                title="Chat Interno"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadChatCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#FA4515] rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{unreadChatCount}</span>
                  </span>
                )}
              </button>
            </div>

            <div className="relative notification-container">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative p-2 rounded-full transition-all duration-300",
                  showNotifications ? "bg-[#E7F3EC] text-[#0F6B41] dark:bg-white/10 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10"
                )}
                title="Notificaciones"
              >
                <Bell className={cn("w-6 h-6", unreadCount > 0 && "animate-[bell-swing_2s_infinite]")} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{unreadCount}</span>
                  </span>
                )}
              </button>

              <NotificationsPanel 
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onClearAll={clearAllNotifications}
                onRequestDesktop={handleRequestNotifications}
                clientOrders={clientOrders}
                onApproveOrder={approveClientOrder}
                onRejectOrder={rejectClientOrder}
              />
            </div>
          </div>
        </header>

        {/* Content Box */}
        <div className="p-4 md:p-8 pb-32 md:pb-8">
          <Outlet />
        </div>
        <ChatWidget isOpenExternal={isChatOpen} onCloseExternal={() => setIsChatOpen(false)} />
        <MagneticDock />
      </main>
    </div>
  );
}
