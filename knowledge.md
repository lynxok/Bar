# 🧠 LYNX BarOS — Base de Conocimiento y Arquitectura

Este archivo documenta las decisiones de diseño clave, la estructura de la base de datos local y los flujos críticos del sistema de gestión comercial para bares, restaurantes y cafeterías.

---

## 🗄️ 1. Persistencia Local (Dexie / IndexedDB)
El sistema funciona bajo el paradigma **offline-first**. Toda la información operativa reside en el navegador del cliente mediante la base de datos `BarDatabase` configurada en [database.ts](file:///c:/Users/ignac/OneDrive/LYNX/BAR/src/db/database.ts).

### Tablas Críticas
* **`salonTables`**: Estado actual de cada mesa física del salón (coordenadas, capacidad, waiterName, items en el carrito activo y estado de la mesa).
* **`orders`**: Historial inmutable de cuentas cerradas y facturadas.
* **`shifts`**: Registro de turnos de caja. Controla el fondo inicial de efectivo, las ventas por método de pago, el efectivo declarado por el cajero y descuadres (diferencias).
* **`loyaltyConfig`**: Persistencia de configuraciones globales del programa de fidelización (equivalencia de punto a peso, niveles y promociones).
* **`loyaltyTransactions`**: Log de auditoría para aumentos de puntos (compras) y disminuciones (canje de recompensas).

---

## 🔑 2. Flujos Operativos Críticos

### A. Cierre de Mesa vs. POS Rápido (`StoreContext.tsx`)
1. **Mesas de Salón (`closeOrder`)**: 
   * Recupera la mesa desde `salonTables`.
   * Registra la orden en la tabla `orders` vinculando el `tableId` real.
   * Descuenta stock de productos de forma atómica.
   * Distribuye proporcionalmente y acredita puntos de fidelidad a los DNI ingresados si la cuenta fue dividida.
   * Libera la mesa cambiando su estado a `'available'` y limpiando su carrito.
2. **POS Rápido (`closePOSOrder`)**:
   * No requiere buscar una mesa existente. Persiste la venta directamente en `orders` bajo el identificador genérico `'POS_FAST'`, descontando stock de manera inmediata para evitar desajustes en el inventario.

### B. Control de Turnos y Caja (`CashClose.tsx`)
El sistema no permite transacciones si no hay un turno abierto:
* **Apertura:** Registra el nombre del operador y el fondo inicial (`initialCash`). Establece el estado del shift como `'active'`.
* **Cierre:** Filtra todas las órdenes pagadas desde la fecha de inicio del turno activo. Calcula los totales teóricos desglosados y los compara contra el efectivo contado declarado.

---

## 🍳 3. Estaciones de Trabajo y KDS (`Kitchen.tsx`)
El monitor de cocina admite segmentación física mediante el filtro de estaciones:
* **Categorización Dinámica:** Las estaciones se autogeneran a partir de las categorías existentes en la tabla `products` (ej. Cocina, Bebidas, Cafetería).
* **Filtrado Inteligente:** Una comanda de comida y bebida se muestra en la pantalla del bartender únicamente con sus bebidas, y en la del cocinero únicamente con la comida.
* **Notificaciones Web Audio API:** Al ingresar un nuevo pedido, se genera una alerta sonora sintetizada mediante osciladores nativos del navegador, garantizando un aviso audible sin necesidad de archivos de audio externos.

---

## ⚡ 4. Recomendaciones de Rendimiento y Desarrollo Futuro
1. **Optimización de Render:** Al utilizar un contexto global (`StoreContext`), las actualizaciones frecuentes en comandas de cocina o estados de mesa pueden forzar re-renders generalizados. En futuras expansiones, conviene migrar tablas muy transaccionales (como comandas) a contextos locales o selectores de estado reactivos.
2. **Esquema de Base de Datos:** Los cambios en `database.ts` requieren incrementar la versión del constructor (`version(N)`) para que Dexie ejecute automáticamente la migración de esquemas en IndexedDB sin pérdida de datos.
