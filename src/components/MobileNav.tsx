import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Grid, 
  MonitorCheck, 
  Package, 
  Settings,
  Menu
} from "lucide-react";
import { cn } from "../lib/utils";

interface MobileNavProps {
  onMenuClick: () => void;
}

export function MobileNav({ onMenuClick }: MobileNavProps) {
  const items = [
    { path: "/", label: "Home", icon: LayoutDashboard },
    { path: "/mapa", label: "Mapa", icon: Grid },
    { path: "/pos", label: "Ventas", icon: MonitorCheck },
    { path: "/inventario", label: "Stock", icon: Package },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors",
            isActive ? "text-indigo-600" : "text-slate-400"
          )}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          {/* Active indicator dot */}
          <div className="h-1 w-1 rounded-full bg-indigo-600 opacity-0 transition-opacity" />
        </NavLink>
      ))}
      
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-1 w-16 h-full text-slate-400"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Más</span>
      </button>
    </nav>
  );
}
