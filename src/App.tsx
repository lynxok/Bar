import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TableMap } from './pages/TableMap';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Finance } from './pages/Finance';
import { CashClose } from './pages/CashClose';
import { Analytics } from './pages/Analytics';
import { Loyalty } from './pages/Loyalty';
import { BillingDrafts } from './pages/BillingDrafts';
import { Settings } from './pages/Settings';
import { ClientSummary } from './pages/ClientSummary';
import { MenuConfig } from './pages/MenuConfig';
import { Security } from './pages/Security';
import { Logs } from './pages/Logs';
import Kitchen from './pages/Kitchen';
import Help from './pages/Help';
import Reservations from './pages/Reservations';
import Mugs from './pages/Mugs';
import { Login } from './pages/Login';
import { WaiterMobile } from './pages/WaiterMobile';
import { useState, useEffect } from 'react';
import { startSyncService, stopSyncService } from './services/syncService';
import { runAutoBackupIfNeeded } from './lib/backup';
import { isHost } from './db/database';
import {
  getStoredUser, verifySession, onUnauthorized, isPublicClientRoute,
  isSuperadminRole, isAdminRole, type SessionUser,
} from './lib/auth';

export default function App() {
  const isClientRoute = isPublicClientRoute();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => getStoredUser());
  const [checkingSession, setCheckingSession] = useState(!isClientRoute && !!getStoredUser());
  const isAuthenticated = !!currentUser;

  // Validar la sesión guardada contra el host (el rol nunca se toma de localStorage)
  useEffect(() => {
    if (isClientRoute) return;
    verifySession()
      .then(user => setCurrentUser(user))
      .finally(() => setCheckingSession(false));
    return onUnauthorized(() => setCurrentUser(null));
  }, [isClientRoute]);

  // Sincronización: solo con sesión válida (o en modo comensal para la carta QR)
  useEffect(() => {
    if (checkingSession) return;
    if (!isAuthenticated && !isClientRoute) return;
    startSyncService();
    return () => stopSyncService();
  }, [isAuthenticated, isClientRoute, checkingSession]);

  // Copia de seguridad automática diaria (solo en la PC principal)
  useEffect(() => {
    if (!isHost) return;
    const tick = () => runAutoBackupIfNeeded().catch(err => console.error('Backup automático falló', err));
    const first = setTimeout(tick, 15_000);
    const every = setInterval(tick, 60 * 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  const handleLogin = (user: SessionUser) => {
    setCurrentUser(user);
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!isAuthenticated && !isClientRoute) {
    return <Login onLogin={handleLogin} />;
  }

  // Redirect waiters directly to /mozo if they are on another admin page
  const isWaiter = currentUser?.role?.toLowerCase() === 'mozo';

  return (
    <Routes>
      {isWaiter ? (
        <>
          <Route path="/mozo" element={<WaiterMobile />} />
          <Route path="*" element={<Navigate to="/mozo" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="mapa" element={<TableMap />} />
            <Route path="reservas" element={<Reservations />} />
            <Route path="pos" element={<POS />} />
            <Route path="inventario" element={<Inventory />} />
            <Route path="finanzas" element={<Finance />} />
            <Route path="cierre" element={<CashClose />} />
            <Route path="analitica" element={<Analytics />} />
            <Route path="fidelizacion" element={<Loyalty />} />
            <Route path="vasos" element={<Mugs />} />
            <Route path="facturacion" element={<BillingDrafts />} />
            <Route path="configuracion" element={<Settings />} />
            <Route path="carta" element={<MenuConfig />} />
            <Route path="seguridad" element={isAdminRole(currentUser?.role) ? <Security /> : <Navigate to="/" replace />} />
            <Route path="logs" element={isSuperadminRole(currentUser?.role) ? <Logs /> : <Navigate to="/" replace />} />
            <Route path="cocina" element={<Kitchen />} />
            <Route path="ayuda" element={<Help />} />
            <Route path="mozo" element={<WaiterMobile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </>
      )}
      <Route path="cliente/:tableId" element={<ClientSummary />} />
    </Routes>
  );
}
