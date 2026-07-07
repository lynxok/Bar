# LYNX BarOS Core Knowledge & Architecture Base

Este archivo actúa como la base de conocimiento consolidada sobre el estado actual, arquitectura y componentes clave implementados en **LYNX BarOS**. Sirve para brindar un contexto inmediato sobre la aplicación de escritorio a los subagentes en nuevas conversaciones y optimizar el consumo de tokens.

---

## 1. Arquitectura Tecnológica
* **Frontend:** React 19, TypeScript, Vite.
* **Estilos (CSS):** Tailwind CSS v4.
* **Entorno de Escritorio:** Electron (Main-Renderer IPC y empaquetado nativo con `electron-builder`).
* **Base de Datos Local:** Dexie.js (IndexedDB) como motor de persistencia offline-first con soporte para operaciones transaccionales y reactividad con hooks de React (`dexie-react-hooks`).

---

## 2. Esquema de Base de Datos Dexie (`src/db/database.ts`)
La base de datos local `BarDatabase` (versión 7) tiene los siguientes almacenes principales:
* **`products`**: Productos del menú/inventario (SKU, código de barras, stock, precio take-away, categoría).
* **`orders`**: Historial de órdenes y tickets de venta (tableId, items, total, status `open`|`closed`, método de pago).
* **`expenses`**: Egresos y pagos a proveedores.
* **`salonTables`**: Estado geométrico y de ocupación de las mesas del salón (id, status `available`|`occupied`|`checkout`, coordenadas x/y, tipo, dimensiones, capacidad, rotación, lista de items de la orden activa).
* **`comandas`**: Pedidos enviados a la cocina (id, tableId, items, status `pending`|`preparing`|`ready`|`delivered`, timestamp).
* **`shifts`**: Control de turnos y arqueos de caja (apertura, cierre, efectivo esperado vs declarado, diferencia, totales de tarjetas y transferencias).
* **`users`**: Control de acceso de empleados (roles, PIN numérico y permisos).
* **`messages`**: Chat interno rápido entre Caja (Cashier) y Cocina.
* **`floorPlans`**: Diseños y plantillas guardadas del mapa de mesas.

---

## 3. Páginas y Componentes Clave (`src/pages/`)

* **`POS.tsx`**: Interfaz de punto de venta. Permite seleccionar productos, cargar a una mesa, aplicar descuentos y procesar pagos (efectivo, tarjeta, transferencia).
* **`TableMap.tsx`**: Mapa interactivo del salón. Soporta creación, edición (arrastrar, rotar y redimensionar mesas) y visualización del estado de ocupación en tiempo real.
* **`Kitchen.tsx`**: Pantalla para cocineros. Muestra comandas activas agrupadas por estado, temporizadores de preparación y cambio de estados con un toque.
* **`Inventory.tsx`**: Panel completo de stock. Soporta carga de artículos, lectura de código de barras, alertas por bajo stock, control de proveedores y exportación a Excel.
* **`CashClose.tsx`**: Módulo de arqueo y cierre de caja. Permite la apertura de turnos con caja inicial y el cierre declarando efectivo real para calcular diferencias.
* **`Finance.tsx`**: Registro de gastos diarios, cuentas por pagar a proveedores y balances mensuales.
* **`Loyalty.tsx`**: Base de datos de clientes y catálogo de premios canjeables por puntos acumulados en compras.
* **`Security.tsx`**: Gestión de roles (Administrador, Cajero, Mozo, Cocinero) y asignación de permisos individuales protegidos por PIN.

---

## 4. Flujo de Trabajo Gastronómico Integrado
1. **Atención/Salón (`TableMap.tsx`):** Un mozo abre una mesa y carga items. El estado de la mesa pasa a `occupied` y se guarda en `salonTables`.
2. **Envío a Cocina (`Kitchen.tsx`):** Al confirmar, los platos se envían como una nueva `comanda` en estado `pending`.
3. **Preparación:** La cocina cambia el estado de la comanda a `preparing` y luego a `ready` cuando está lista para ser servida.
4. **Pago y Facturación (`POS.tsx`):** Al pedir la cuenta, la mesa pasa a `checkout`. Al registrar el pago, la orden se cierra en `orders`, el stock físico de productos se descuenta en `products` y la mesa se libera (`available`).
5. **Cierre de Turno (`CashClose.tsx`):** Al finalizar la jornada, el cajero realiza el arqueo comparando el dinero registrado en `orders` con el efectivo físico en caja.
