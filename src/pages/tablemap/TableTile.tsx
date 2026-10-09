import React from 'react';
import { cn } from '../../lib/utils';
import { formatMoney } from '../../lib/format';
import { timeLabel } from '../../lib/reservations';
import type { Table } from '../../contexts/StoreContext';

interface TableTileProps {
  key?: React.Key;
  table: Table;
  isSelected: boolean;
  isDragging: boolean;
  isRotating: boolean;
  isEditingLayout: boolean;
  dragPos: { x: number; y: number };
  liveRotation: number;
  reservation?: { customerName: string; partySize: number; date: string } | null;
  onMouseDown: (e: React.MouseEvent, table: Table) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
  onRotateHandleMouseDown: (e: React.MouseEvent, table: Table) => void;
  onResizePointerDown: (e: React.PointerEvent, table: Table) => void;
  onResizePointerMove: (e: React.PointerEvent, table: Table) => void;
  onResizePointerUp: (e: React.PointerEvent, table: Table) => void;
}

export function TableTile({
  table,
  isSelected,
  isDragging,
  isRotating,
  isEditingLayout,
  dragPos,
  liveRotation,
  reservation,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onRotateHandleMouseDown,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
}: TableTileProps) {
  const x = isDragging ? dragPos.x : table.x;
  const y = isDragging ? dragPos.y : table.y;
  const rotation = isRotating ? liveRotation : (table.rotation ?? 0);

  // Status tokens conforming to LYNX guidelines
  const statusStyles: Record<Table['status'], { bg: string; text: string; border: string; label: string }> = {
    available: {
      bg: 'bg-white dark:bg-dark-card',
      text: 'text-brand dark:text-emerald-400',
      border: 'border-2 border-brand',
      label: 'Disponible',
    },
    occupied_no_order: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-brand dark:text-emerald-300',
      border: 'border-2 border-emerald-300 dark:border-emerald-700',
      label: 'Sin pedido',
    },
    waiting_food: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-900 dark:text-amber-200',
      border: 'border-2 border-amber-500',
      label: 'En cocina',
    },
    consuming: {
      bg: 'bg-brand',
      text: 'text-white',
      border: 'border-2 border-brand',
      label: 'Consumiendo',
    },
    checkout: {
      bg: 'bg-accent animate-pulse',
      text: 'text-white',
      border: 'border-2 border-accent',
      label: 'Por cobrar',
    },
    dirty: {
      bg: 'bg-slate-200 dark:bg-white/10',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-2 border-slate-400 dark:border-white/20',
      label: 'Sucia',
    },
    occupied: {
      bg: 'bg-brand',
      text: 'text-white',
      border: 'border-2 border-brand',
      label: 'Ocupada',
    },
  };

  const currentStatus = statusStyles[table.status] || statusStyles.available;
  const consumedTotal = (table.order || []).reduce((acc, it) => acc + (it.price * it.qty), 0);
  const elapsedMinutes = table.lastUpdate ? Math.floor((Date.now() - new Date(table.lastUpdate).getTime()) / 60000) : null;
  const isLate = table.status === 'waiting_food' && (elapsedMinutes ?? 0) >= 15;

  const baseSize = Math.min(table.width, table.height);
  const fontSizeId = Math.max(14, Math.round(baseSize * 0.22));

  return (
    <div
      className={cn(
        "absolute select-none touch-none",
        isEditingLayout ? "cursor-move" : "cursor-pointer",
        isDragging ? "z-50" : "z-10",
      )}
      style={{
        left: x,
        top: y,
        width: table.width,
        height: table.height,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        transition: isDragging || isRotating ? 'none' : 'transform 0.15s ease',
        filter: isSelected ? 'drop-shadow(0 0 8px rgba(15,107,65,0.9))' : isDragging ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.25))' : 'none',
      }}
      onMouseDown={(e) => onMouseDown(e, table)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {table.type === 'wall' ? (
        <div className="w-full h-full bg-slate-500 border-2 border-slate-600 rounded-sm shadow-md flex items-center justify-center overflow-hidden">
          <div className="w-full h-full opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#000 0,#000 1px,transparent 0,transparent 50%)', backgroundSize: '10px 10px' }} />
        </div>
      ) : table.type === 'bar' ? (
        <div className={cn(
          "w-full h-full bg-brand-dark border-l-8 border-accent rounded-l-3xl shadow-xl flex items-center justify-center overflow-hidden",
          isSelected ? "ring-4 ring-brand ring-offset-2" : ""
        )}>
          <div className="rotate-90 text-white/20 font-black text-2xl tracking-[0.5em] uppercase whitespace-nowrap select-none">BARRA</div>
        </div>
      ) : (
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-between p-2 relative shadow-md transition-all duration-200 overflow-hidden",
            (table.type === 'round' || table.type === 'stool') ? "rounded-full" : "rounded-2xl",
            currentStatus.bg,
            currentStatus.border,
            currentStatus.text,
            !isEditingLayout && "hover:scale-[1.03] hover:shadow-xl cursor-pointer"
          )}
        >
          {/* Top row: Status / Timer & Table Number */}
          <div className={cn(
            "w-full flex items-center text-xs font-semibold tracking-tight px-0.5",
            (table.type === 'round' || table.type === 'stool')
              ? "justify-center relative"
              : "justify-between"
          )}>
            <span
              className={cn(
                "font-bold tracking-tight leading-none",
                (table.type === 'round' || table.type === 'stool') && "text-center"
              )}
              style={{ fontSize: `${fontSizeId}px` }}
              title={table.id}
              data-table-id={table.id}
            >
              {table.id}
            </span>
            {elapsedMinutes !== null && table.status !== 'available' && table.status !== 'dirty' && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums",
                (table.type === 'round' || table.type === 'stool') ? "absolute right-0 top-0" : "",
                isLate ? "bg-danger text-white animate-bounce" : "bg-black/15 text-current"
              )}>
                ⏱ {elapsedMinutes}m
              </span>
            )}
          </div>

          {/* Middle row: Consumed Amount or Status Name */}
          <div className="text-center my-auto flex flex-col items-center justify-center">
            {consumedTotal > 0 ? (
              <span className="font-bold text-sm lg:text-base tabular-nums leading-tight tracking-tight drop-shadow-xs">
                {formatMoney(consumedTotal)}
              </span>
            ) : (
              <span className="text-xs font-semibold opacity-85 leading-tight">
                {currentStatus.label}
              </span>
            )}
          </div>

          {/* Bottom row: Waiter Name & Reservation Badge */}
          <div className="w-full flex items-center justify-between gap-1 overflow-hidden px-0.5">
            {table.waiterName ? (
              <span className="text-xs font-semibold truncate bg-black/10 px-1 py-0.5 rounded max-w-[70px]">
                {table.waiterName}
              </span>
            ) : <span />}

            {reservation && (
              <span
                title={`Reserva: ${reservation.customerName} (${reservation.partySize} pers.)`}
                className="text-xs font-semibold bg-brand-dark text-white px-1.5 py-0.5 rounded shrink-0 shadow-xs"
              >
                📅 {timeLabel(reservation.date)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Rotation handle in editing mode */}
      {isSelected && isEditingLayout && table.type !== 'round' && table.type !== 'stool' && (
        <div
          title="Rotar"
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center cursor-grab shadow-lg z-20 hover:bg-brand-hover border-2 border-white transition-all active:scale-95"
          onMouseDown={(e) => onRotateHandleMouseDown(e, table)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </div>
      )}

      {/* Resize handle in editing mode */}
      {isSelected && isEditingLayout && (
        <div
          className="absolute right-0 bottom-0 w-10 h-10 flex items-center justify-center cursor-se-resize translate-x-3 translate-y-3 z-30 group/resize"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => onResizePointerDown(e, table)}
          onPointerMove={(e) => onResizePointerMove(e, table)}
          onPointerUp={(e) => onResizePointerUp(e, table)}
        >
          <div className="w-4 h-4 bg-brand border-2 border-white rounded-full shadow-md group-hover/resize:scale-125 transition-transform" />
        </div>
      )}
    </div>
  );
}
