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
  ChefHat
} from "lucide-react";
import { cn } from "../lib/utils";
import { ChatWidget } from "./ChatWidget";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/mapa", label: "Mapa del Salón", icon: Grid },
  { path: "/pos", label: "Punto de Venta (POS)", icon: MonitorCheck },
  { path: "/inventario", label: "Inventario", icon: Package },
  { path: "/finanzas", label: "Finanzas", icon: Wallet },
  { path: "/cierre", label: "Cierre de Caja", icon: Banknote },
  { path: "/analitica", label: "Analítica", icon: BarChart },
  { path: "/fidelizacion", label: "Fidelización", icon: Award },
  { path: "/cocina", label: "Cocina", icon: ChefHat },
  { path: "/seguridad", label: "Auditoría y Seguridad", icon: ShieldAlert },
];

export function Layout() {
  const location = useLocation();
  const { businessName, logo } = useBusiness();
  const { lowStockCount } = useAlerts();

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

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const MENU_ITEMS = [
    ...NAV_ITEMS,
    { path: "/configuracion", label: "Configuración", icon: Settings },
    { path: "/ayuda", label: "Ayuda", icon: HelpCircle }
  ];

  useEffect(() => {
    if (lowStockCount > 0) {
      // Intenta enviar notificación si hay permisos al iniciar (o cambiar el stock)
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
    } else {
      alert('Las notificaciones fueron denegadas o no están soportadas.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Usar F2 para enfocar el escáner globalmente
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

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased overflow-x-hidden flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col text-slate-300 shadow-xl z-50">
        <div className="p-6 flex items-center gap-3">
          {logo ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Utensils className="h-5 w-5 text-white" />
            </div>
          )}
          <span className="font-bold text-white text-xl tracking-tight leading-tight truncate" title={businessName}>
            {businessName}
          </span>
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
                  "flex items-center px-4 py-3 rounded-lg gap-3 transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-slate-800"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400")} />
                <span className="text-sm font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white uppercase">
                {(() => {
                  try {
                    const u = JSON.parse(sessionStorage.getItem('bar_user') || '{}');
                    return (u.name || 'U').substring(0, 2);
                  } catch { return 'U'; }
                })()}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold text-white truncate w-24">
                  {(() => {
                    try { return JSON.parse(sessionStorage.getItem('bar_user') || '{}').name || 'Usuario'; } catch { return 'Usuario'; }
                  })()}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {(() => {
                    try { return JSON.parse(sessionStorage.getItem('bar_user') || '{}').role || 'Staff'; } catch { return 'Staff'; }
                  })()}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => {
                sessionStorage.removeItem('bar_user');
                window.location.reload();
              }}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Agency Footer */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Desarrollado por</span>
              <a href="https://www.lnx.com.ar" target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform">
                <img src="/lynx-consulting-logo.png" alt="LYNX Consulting" className="h-12 object-contain" />
              </a>
            </div>
            <span className="text-[9px] text-slate-600 font-medium tracking-widest">v1.0.0 (Local-First)</span>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between sticky top-0 z-40">
          <h2 className="text-lg font-semibold text-slate-800 hidden md:block">
            Panel de Control
          </h2>
          <div className="flex items-center gap-4 ml-auto">
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
            <button 
              onClick={handleRequestNotifications}
              className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Activar notificaciones de escritorio"
            >
              <Bell className="w-6 h-6" />
              {lowStockCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
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
