import { Outlet, Link, useLocation } from "react-router-dom";
import { useBusiness } from "../contexts/BusinessContext";
import { useAlerts } from "../contexts/AlertContext";
import { NotificationService } from "../lib/NotificationService";
import { useEffect, useState } from "react";
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
  Sun,
  Moon,
  ShieldAlert,
  ChefHat,
  FileText,
  Terminal
} from "lucide-react";
import { cn } from "../lib/utils";
import { ChatWidget } from "./ChatWidget";
import { NotificationsPanel } from "./NotificationsPanel";
import { useStore } from "../contexts/StoreContext";
import { isHost } from "../db/database";
import { onSyncStateChange } from "../services/syncService";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  time: string;
  read: boolean;
}

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/mapa", label: "Mapa del Salón", icon: Grid },
  { path: "/pos", label: "Punto de Venta (POS)", icon: MonitorCheck },
  { path: "/inventario", label: "Inventario", icon: Package },
  { path: "/finanzas", label: "Finanzas", icon: Wallet },
  { path: "/cierre", label: "Cierre de Caja", icon: Banknote },
  { path: "/analitica", label: "Analítica", icon: BarChart },
  { path: "/fidelizacion", label: "Fidelización", icon: Award },
  { path: "/facturacion", label: "Borradores de Factura", icon: FileText },
  { path: "/cocina", label: "Cocina", icon: ChefHat },
  { path: "/seguridad", label: "Auditoría y Seguridad", icon: ShieldAlert },
];

export function Layout() {
  const location = useLocation();
  const { businessName, logo } = useBusiness();
  const { lowStockCount } = useAlerts();
  const { clientOrders, approveClientOrder, rejectClientOrder } = useStore();
  const [prevPendingCount, setPrevPendingCount] = useState(0);
  const [syncConnected, setSyncConnected] = useState(true);

  // Escuchar el estado de sincronización en clientes remotos
  useEffect(() => {
    onSyncStateChange((connected) => {
      setSyncConnected(connected);
    });
  }, []);
  
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

  const userString = localStorage.getItem('bar_user');
  let isSuperadminDev = false;
  try {
    if (userString) {
      const u = JSON.parse(userString);
      isSuperadminDev = u.role?.toLowerCase() === 'superadmin dev';
    }
  } catch (e) {
    console.error(e);
  }

  const MENU_ITEMS = [
    ...NAV_ITEMS,
    ...(isSuperadminDev ? [{ path: "/logs", label: "Registro Técnico", icon: Terminal }] : []),
    { path: "/configuracion", label: "Configuración", icon: Settings },
    { path: "/ayuda", label: "Ayuda", icon: HelpCircle }
  ];

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
      alert('Las notificaciones fueron denegadas o no están soportadas.');
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
        "fixed left-0 top-0 h-screen bg-slate-900 flex flex-col text-slate-300 shadow-xl z-50 transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="p-6 flex items-center gap-3 overflow-hidden">
          {logo ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Utensils className="h-5 w-5 text-white" />
            </div>
          )}
          {!isSidebarCollapsed && (
            <span className="font-bold text-white text-xl tracking-tight leading-tight truncate transition-all duration-300 animate-in fade-in" title={businessName}>
              {businessName}
            </span>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg gap-3 transition-all duration-300",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-slate-800",
                  isSidebarCollapsed ? "justify-center px-2" : ""
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-slate-400")} />
                {!isSidebarCollapsed && (
                  <span className="text-sm font-medium animate-in fade-in duration-300">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white uppercase flex-shrink-0">
                {(() => {
                  try {
                    const u = JSON.parse(localStorage.getItem('bar_user') || '{}');
                    return (u.name || 'U').substring(0, 2);
                  } catch { return 'U'; }
                })()}
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden animate-in fade-in duration-300">
                  <div className="text-sm font-semibold text-white truncate w-24">
                    {(() => {
                      try { return JSON.parse(localStorage.getItem('bar_user') || '{}').name || 'Usuario'; } catch { return 'Usuario'; }
                    })()}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {(() => {
                      try { return JSON.parse(localStorage.getItem('bar_user') || '{}').role || 'Staff'; } catch { return 'Staff'; }
                    })()}
                  </div>
                </div>
              )}
            </div>
            
            {!isSidebarCollapsed && (
              <button 
                onClick={() => {
                  localStorage.removeItem('bar_user');
                  window.location.reload();
                }}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0 animate-in fade-in"
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Agency Footer */}
          {!isSidebarCollapsed && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col items-center gap-3 opacity-80 hover:opacity-100 transition-opacity animate-in fade-in duration-300">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Desarrollado por</span>
                <a href="https://www.lnx.com.ar" target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform">
                  <img src="./lynx-consulting-logo.png" alt="LYNX Consulting" className="h-12 object-contain" />
                </a>
              </div>
              <span className="text-[9px] text-slate-600 font-medium tracking-widest">v1.1.1 (Local-First)</span>
            </div>
          )}

        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        isSidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
              title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-slate-800 hidden md:block">
              Panel de Control
            </h2>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            {!isHost && (
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black border transition-all duration-300 tracking-wider",
                syncConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-rose-50 text-rose-700 border-rose-100 animate-pulse"
              )} title={syncConnected ? "Sincronizado con PC Base" : "Error de sincronización con PC Base"}>
                <span className={cn("w-1.5 h-1.5 rounded-full", syncConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500")}></span>
                {syncConnected ? 'CONECTADO' : 'DESCONECTADO'}
              </div>
            )}
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
            <div className="relative notification-container">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative p-2 rounded-full transition-all duration-300",
                  showNotifications ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
        <div className="p-8">
          <Outlet />
        </div>
        <ChatWidget />
      </main>
    </div>
  );
}
