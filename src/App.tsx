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
import { Settings } from './pages/Settings';
import { ClientSummary } from './pages/ClientSummary';
import { Security } from './pages/Security';
import Kitchen from './pages/Kitchen';
import Help from './pages/Help';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="mapa" element={<TableMap />} />
        <Route path="pos" element={<POS />} />
        <Route path="inventario" element={<Inventory />} />
        <Route path="finanzas" element={<Finance />} />
        <Route path="cierre" element={<CashClose />} />
        <Route path="analitica" element={<Analytics />} />
        <Route path="fidelizacion" element={<Loyalty />} />
        <Route path="configuracion" element={<Settings />} />
        <Route path="seguridad" element={<Security />} />
        <Route path="cocina" element={<Kitchen />} />
        <Route path="ayuda" element={<Help />} />
        <Route path="cliente/:tableId" element={<ClientSummary />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
