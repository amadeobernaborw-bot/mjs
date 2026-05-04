import { Routes, Route, Navigate } from 'react-router-dom';
import Store from './pages/Store';
import Login from './pages/admin/Login';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Profile from './pages/admin/Profile';
import Inventory from './pages/admin/Inventory';
import TradeInConfig from './pages/admin/TradeInConfig';
import Clients from './pages/admin/Clients';
import Invoices from './pages/admin/Invoices';
import CashMovements from './pages/admin/CashMovements';
import ProtectedRoute from './router/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Store />} />
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="trade-in" element={<TradeInConfig />} />
        <Route path="cash" element={<CashMovements />} />
        <Route path="clients" element={<Clients />} />
        <Route path="invoices" element={<Invoices />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
