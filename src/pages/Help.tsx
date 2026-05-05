import React, { useState } from 'react';
import { 
  HelpCircle, 
  MonitorSmartphone, 
  LayoutGrid, 
  ChefHat, 
  Gift, 
  Settings, 
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';

const HELP_SECTIONS = [
  {
    id: 'pos',
    title: 'Punto de Venta (POS)',
    icon: MonitorSmartphone,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    description: 'Aprende a realizar ventas rápidas y cobrar en mostrador.',
    items: [
      {
        q: '¿Cómo hago una venta rápida?',
        a: 'Ve a la sección "Terminal POS", selecciona los productos haciendo clic en ellos, y pulsa el botón "Cobrar" (o "Cocina" si requiere preparación). El sistema te pedirá elegir el método de pago.'
      },
      {
        q: '¿Cómo vinculo una venta a un cliente para que sume puntos?',
        a: 'Al momento de presionar "Cobrar", verás un campo para ingresar el DNI del cliente. Si el cliente está registrado, el sistema lo reconocerá y sumará puntos automáticamente tras el pago.'
      },
      {
        q: '¿Para qué sirve el botón "Cocina" en el POS?',
        a: 'Si un cliente pide algo en mostrador que requiere ser preparado (como un café o un sándwich caliente), presiona "Cocina" para enviar el ticket directamente al monitor de los cocineros sin tener que asignarlo a una mesa.'
      }
    ]
  },
  {
    id: 'tables',
    title: 'Gestión de Mesas',
    icon: LayoutGrid,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    description: 'Controla el salón, asigna pedidos y cierra cuentas.',
    items: [
      {
        q: '¿Cómo abro una mesa?',
        a: 'En la sección "Mesas", haz clic sobre cualquier mesa que esté en verde (Libre). Esto abrirá el panel de pedidos donde podrás ir añadiendo los platos que pidan los comensales.'
      },
      {
        q: '¿Cómo envío un pedido a la cocina?',
        a: 'Dentro del panel de la mesa, selecciona los productos deseados y pulsa el botón azul "Enviar a Cocina". Esto enviará una alerta al monitor KDS.'
      },
      {
        q: '¿Cómo cobro una mesa y la libero?',
        a: 'Una vez que los comensales pidan la cuenta, presiona "Cerrar Mesa", selecciona el método de pago y confirma. La mesa volverá a estar libre (color verde).'
      }
    ]
  },
  {
    id: 'kitchen',
    title: 'Monitor de Cocina (KDS)',
    icon: ChefHat,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    description: 'Gestión de tiempos y preparación de pedidos.',
    items: [
      {
        q: '¿Cómo se marcan los pedidos?',
        a: 'Cuando llega un pedido (Pendiente), pulsa "Empezar Preparación". Cuando la comida esté terminada, pulsa "Marcar como Listo". Finalmente, cuando el mozo se lo lleve, pulsa "Entregar Pedido".'
      },
      {
        q: '¿Qué significa el tiempo estimado?',
        a: 'El sistema calcula automáticamente cuánto tiempo tarda la cocina en preparar cada plato. Esta información se usa para mostrarle al cajero del POS cuánto tiempo de demora hay en base a los pedidos que están en la cola.'
      }
    ]
  },
  {
    id: 'loyalty',
    title: 'Fidelización y Premios',
    icon: Gift,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    description: 'Atrae clientes regalándoles puntos por sus compras.',
    items: [
      {
        q: '¿Cómo registro un nuevo socio?',
        a: 'Ve a la sección "Fidelización" y pulsa "Nuevo Socio". Ingresa su DNI, nombre y datos básicos. ¡Listo! Ya puede empezar a sumar puntos.'
      },
      {
        q: '¿Cómo ganan puntos los clientes?',
        a: 'Por cada compra que realicen, si indicas su DNI en el proceso de cobro, el sistema calculará los puntos automáticamente en base al total gastado.'
      },
      {
        q: '¿Cómo se canjean los premios?',
        a: 'Durante el cobro en el POS, si el cliente tiene suficientes puntos, el sistema mostrará botones brillantes con los premios disponibles (Ej: "Café Gratis"). Al pulsar el premio, se descontarán los puntos del cliente.'
      }
    ]
  },
  {
    id: 'admin',
    title: 'Configuración y Roles',
    icon: Settings,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    description: 'Administración del negocio y permisos de empleados.',
    items: [
      {
        q: '¿Cómo agrego usuarios o empleados?',
        a: 'En "Configuración", ve a la pestaña "Usuarios". Allí podrás crear nuevos accesos y definir sus roles (Ej: Cajero, Cocinero, SuperAdmin) para restringir qué secciones pueden ver.'
      },
      {
        q: '¿Dónde veo los errores o acciones del sistema?',
        a: 'Si eres administrador, tendrás acceso a la sección "Auditoría". Allí se registra cada venta, canje y cualquier error técnico que ocurra en el sistema, lo cual es útil para control interno.'
      }
    ]
  }
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItem, setOpenItem] = useState<string | null>(null);

  // Filter sections based on search query
  const filteredSections = HELP_SECTIONS.map(section => {
    const matchingItems = section.items.filter(
      item => item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
              item.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...section, items: matchingItems };
  }).filter(section => section.items.length > 0 || section.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="text-center space-y-4 pt-8 pb-4">
        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <HelpCircle className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Centro de Ayuda</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Encuentra respuestas rápidas y aprende a utilizar todas las funciones del ecosistema LYNX BAR.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Buscar un tema, ejemplo: 'Cobrar', 'Puntos', 'Mesas'..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all text-lg font-medium outline-none shadow-sm"
        />
      </div>

      <div className="grid gap-8">
        {filteredSections.map(section => (
          <div key={section.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", section.bg)}>
                <section.icon className={cn("w-6 h-6", section.color)} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{section.title}</h2>
                <p className="text-slate-500 font-medium">{section.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {section.items.map((item, idx) => {
                const itemId = `${section.id}-${idx}`;
                const isOpen = openItem === itemId;
                
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "border rounded-2xl transition-all overflow-hidden",
                      isOpen ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <button
                      onClick={() => setOpenItem(isOpen ? null : itemId)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 focus:outline-none"
                    >
                      <span className="font-bold text-slate-800">{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-indigo-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                    </button>
                    <div 
                      className={cn(
                        "transition-all duration-300 ease-in-out",
                        isOpen ? "max-h-96 opacity-100 pb-5" : "max-h-0 opacity-0"
                      )}
                    >
                      <p className="px-6 text-slate-600 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-300">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No encontramos resultados</h3>
            <p className="text-slate-500 mt-2">Intenta buscar con otras palabras o navega por las categorías.</p>
          </div>
        )}
      </div>
    </div>
  );
}
