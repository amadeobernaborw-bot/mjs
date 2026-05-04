import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const SECTIONS = [
  { to: '/admin',           label: 'Resumen',     icon: '⌂', end: true },
  { to: '/admin/inventory', label: 'Inventario',  icon: '📦' },
  { to: '/admin/trade-in',  label: 'Plan Canje',  icon: '🔄' },
  { to: '/admin/cash',      label: 'Caja',        icon: '💰' },
  { to: '/admin/clients',   label: 'Clientes',    icon: '👥' },
  { to: '/admin/invoices',  label: 'Facturas',    icon: '🧾' },
  { to: '/admin/profile',   label: 'Tienda',      icon: '⚙' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin">
      <aside className={`admin__sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin__brand">
          <span className="admin__brand-logo">MJ</span>
          <span className="admin__brand-name">
            MJ Store
            <small>Panel de gestión</small>
          </span>
        </div>

        <nav className="admin__nav">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) => `admin__navlink ${isActive ? 'is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="admin__navicon">{s.icon}</span>
              <span>{s.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin__user">
          <b>{user?.email || '—'}</b>
          <span>Sesión activa</span>
          <Link to="/" className="admin__userlink">Ver storefront →</Link>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="admin__main">
        <button className="admin__menu-toggle" onClick={() => setOpen(!open)} aria-label="Menú">☰</button>
        <Outlet />
      </main>
    </div>
  );
}
