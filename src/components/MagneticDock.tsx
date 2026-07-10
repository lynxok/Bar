import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, MonitorCheck, Package, Wallet, Terminal, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface DockItem {
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
}

export function MagneticDock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const items: DockItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/", color: "from-blue-500 to-indigo-600" },
    { label: "Salón", icon: Users, path: "/mapa", color: "from-indigo-500 to-purple-600" },
    { label: "Ventas POS", icon: MonitorCheck, path: "/pos", color: "from-emerald-500 to-teal-600" },
    { label: "Inventario", icon: Package, path: "/inventario", color: "from-amber-500 to-orange-600" },
    { label: "Finanzas", icon: Wallet, path: "/finanzas", color: "from-pink-500 to-rose-600" },
    { label: "Técnico", icon: Terminal, path: "/logs", color: "from-slate-700 to-slate-900" },
    { label: "Ayuda", icon: HelpCircle, path: "/ayuda", color: "from-cyan-500 to-sky-600" },
  ];

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMouseX(e.clientX - rect.left);
    }
  };

  const handleMouseLeave = () => {
    setMouseX(null);
    setHoveredIndex(null);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {/* Toggle button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 bg-slate-950/80 hover:bg-slate-900 border border-white/10 rounded-full text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all shadow-lg flex items-center gap-1.5"
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        {isOpen ? "Ocultar Dock" : "Accesos"}
      </button>

      {isOpen && (
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="flex items-end gap-3 px-5 py-4 bg-slate-950/70 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl transition-all duration-300 relative"
          style={{ height: "82px" }}
        >
          {items.map((item, idx) => {
            const isSelected = location.pathname === item.path;
            
            // Calculate size dynamically based on cursor distance
            let scale = 1.0;
            if (mouseX !== null && containerRef.current) {
              const itemWidth = 54; // estimated item width
              const gap = 12; // gap size
              const itemCenter = idx * (itemWidth + gap) + itemWidth / 2 + 20; // 20px padding left
              const distance = Math.abs(mouseX - itemCenter);
              
              // Scale function: increases size when closer to the mouse (max 1.42x)
              const maxDistance = 140; // field of influence
              if (distance < maxDistance) {
                const factor = 1 - distance / maxDistance; // 0 to 1
                scale = 1 + factor * 0.42; // scale between 1 and 1.42
              }
            }

            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredIndex(idx)}
                className="relative flex flex-col items-center group"
                style={{
                  width: `${54 * scale}px`,
                  height: `${54 * scale}px`,
                  transition: mouseX === null ? "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)" : "none",
                }}
              >
                {/* Tooltip */}
                <div 
                  className={cn(
                    "absolute -top-12 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[9px] font-black text-white uppercase tracking-wider shadow-lg opacity-0 translate-y-2 pointer-events-none transition-all group-hover:opacity-100 group-hover:translate-y-0 duration-200 z-50 whitespace-nowrap",
                    hoveredIndex === idx && "opacity-100 translate-y-0"
                  )}
                >
                  {item.label}
                </div>

                <Link
                  to={item.path}
                  className={cn(
                    "w-full h-full rounded-2xl flex items-center justify-center bg-gradient-to-b text-white shadow-lg border border-white/10 hover:border-white/20 transition-all",
                    item.color,
                    isSelected && "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950"
                  )}
                >
                  <item.icon className="w-1/2 h-1/2" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
