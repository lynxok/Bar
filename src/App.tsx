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
import { Security } from './pages/Security';
import { Logs } from './pages/Logs';
import Kitchen from './pages/Kitchen';
import Help from './pages/Help';
import { Login } from './pages/Login';
import { WaiterMobile } from './pages/WaiterMobile';
import { useState, useEffect } from 'react';
import { startSyncService, stopSyncService } from './services/syncService';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Iniciar servicio de sincronización
  useEffect(() => {
    startSyncService();
    return () => stopSyncService();
  }, []);

  // Check local storage on load
  useEffect(() => {
    const storedUser = localStorage.getItem('bar_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (user: any) => {
    localStorage.setItem('bar_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('bar_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const isClientRoute = window.location.hash.includes('/cliente/') || window.location.pathname.includes('/cliente/');

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
            <Route path="pos" element={<POS />} />
            <Route path="inventario" element={<Inventory />} />
            <Route path="finanzas" element={<Finance />} />
            <Route path="cierre" element={<CashClose />} />
            <Route path="analitica" element={<Analytics />} />
            <Route path="fidelizacion" element={<Loyalty />} />
            <Route path="facturacion" element={<BillingDrafts />} />
            <Route path="configuracion" element={<Settings />} />
            <Route path="seguridad" element={<Security />} />
            <Route path="logs" element={<Logs />} />
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
