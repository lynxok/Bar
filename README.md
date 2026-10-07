# LYNX BarOS

Sistema de gestión comercial **offline-first** para bares, restaurantes y cafeterías.
App de escritorio (Electron) que funciona como servidor del local; mozos, cocina y caja
se conectan desde celulares o tablets por WiFi, y los comensales piden desde la carta QR.

## Módulos

| Módulo | Qué hace |
|---|---|
| Mapa de mesas | Plano editable (formas, rotación, sillas, varios planos), estados de mesa, unir mesas, pedido y cobro |
| Caja rápida (POS) | Venta de mostrador con fidelización |
| App de mozos (`/mozo`) | Mesas, carta y cobro desde el celular, con descuento y DNI |
| Cocina (KDS) | Comandas por estación con aviso sonoro y estados pendiente → listo → entregado |
| Carta QR (`/cliente/:mesa`) | El comensal pide desde su celular; el salón aprueba o rechaza |
| Inventario y recetas | Stock con descuento automático por insumos y costo estimado del plato |
| Turnos y cierre de caja | Fondo inicial, arqueo por medio de pago y diferencias |
| Finanzas y analítica | Gastos, órdenes de pago, gráficos y exportación a Excel |
| Fidelización | Puntos por DNI, niveles, promociones y premios |
| Facturación ARCA/AFIP | Borradores automáticos, factura electrónica con CAE, PDF con QR |
| Usuarios y auditoría | Roles (Superadmin, Admin, Cajero, Mozo, Cocinero) y registro de acciones |
| Copias de seguridad | Copia diaria automática + exportar/restaurar desde Configuración |

## Arquitectura

```
 PC principal (Electron)                       Celulares / tablets (navegador)
 ┌───────────────────────────────┐             ┌──────────────────────────────┐
 │ Renderer: React + Dexie       │◄── IPC ───► │ React + Dexie (copia local)  │
 │  (base maestra en IndexedDB)  │   Express   │  outbox: cambios pendientes  │
 │ Main: Express :3001           │◄── HTTP ───►│  sync incremental + SSE      │
 │  auth, permisos por rol, SSE  │             └──────────────────────────────┘
 └───────────────────────────────┘
```

- **Base maestra**: IndexedDB del renderer de la PC principal (`src/db/database.ts`).
- **Servidor local** (`electron/main.cjs`): API `/api/*` en el puerto 3001, accesible por la red local
  (y opcionalmente por un túnel ngrok).
- **Autenticación** (`electron/auth.cjs`): contraseñas con scrypt, token de sesión, permisos por rol y
  tabla. La carta QR usa solo rutas públicas (`/api/public/*`) y los precios se recalculan en el servidor.
- **Sincronización** (`src/services/syncService.ts`): incremental por `updatedAt`, borrados por
  `tombstones`, avisos en tiempo real por SSE (`/api/events`) y cola offline (`outbox`) con reintentos.
- **Electron aislado**: `contextIsolation` + `sandbox` + `electron/preload.cjs` con lista de canales IPC permitidos.

## Desarrollo

```bash
npm install
npm run electron:dev     # Vite (3000) + Electron; la API corre en 3001
npm run dev              # solo la interfaz web (sin servidor local)
npm run lint             # chequeo de tipos (tsc)
```

Primer uso: si no existe ningún Superadmin, la pantalla de login de la PC principal pide crearlo.

## Tests

```bash
npm test                 # todo
npm run test:unit        # Vitest: cobros, impuestos, medios de pago, store
npm run test:server      # API: login, permisos por rol, carta QR
npm run test:sync        # integración PC principal <-> celular simulados
```

## Publicar una versión

1. Subir `version` en `package.json`.
2. En PowerShell, con el token solo en la sesión (nunca en archivos del repo ni en la URL del remote):
   ```powershell
   $env:GH_TOKEN = "<token>"
   npm run build; npx electron-builder --publish always
   ```

## Estructura

```
electron/        main.cjs (servidor, IPC, ARCA, backups), auth.cjs, preload.cjs
src/db/          esquema Dexie, hooks de sync, outbox
src/services/    syncService (dispositivos), sales (cobros)
src/lib/         auth, ipc, pricing, payments, backup, publicUrl
src/contexts/    StoreContext (store con suscripción selectiva), BusinessContext
src/pages/       pantallas
tests/           unit (Vitest), server, integration
```
