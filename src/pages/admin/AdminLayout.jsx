import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  ArrowUpRight, LayoutDashboard, LogOut, Menu, Package, Palette, PanelLeftClose, PanelLeftOpen,
  Receipt, RefreshCw, Settings, Users, Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useStoreProfile } from '../../hooks/useStoreProfile';
import { useDocumentTheme, THEME_SCOPES } from '../../lib/theme';
import { confirmDiscardUnsavedChanges } from '../../components/widgets/hooks';

const SECTIONS = [
  { to: '/admin',           label: 'Resumen',     icon: LayoutDashboard, end: true },
  { to: '/admin/inventory', label: 'Inventario',  icon: Package },
  { to: '/admin/trade-in',  label: 'Plan Canje',  icon: RefreshCw },
  { to: '/admin/cash',      label: 'Caja',        icon: Wallet },
  { to: '/admin/clients',   label: 'Clientes',    icon: Users },
  { to: '/admin/invoices',  label: 'Facturas',    icon: Receipt },
  { to: '/admin/appearance', label: 'Apariencia', icon: Palette },
  { to: '/admin/profile',   label: 'Tienda',      icon: Settings },
];

const SIDEBAR_STORAGE_KEY = 'mj-admin-sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Panel lateral contraído a solo íconos (escritorio). Se recuerda por navegador; atajo Ctrl/Cmd + B. */
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Sin almacenamiento (modo privado): el estado vale solo para esta visita
    }
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

  return [collapsed, toggle];
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, setProfile, loading: profileLoading } = useStoreProfile();
  useDocumentTheme(THEME_SCOPES.admin, profile.admin_theme);
  const [open, setOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  const storeName = profile?.store_name || 'Tu Tienda';
  const initials = storeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'TT';

  const handleLogout = async () => {
    if (!confirmDiscardUnsavedChanges()) return;
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className={`admin ${collapsed ? 'admin--collapsed' : ''}`}>
      <aside className={`admin__sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin__brand">
          {profile?.logo_url ? (
            <img className="admin__brand-logo admin__brand-logo--img" src={profile.logo_url} alt={storeName} />
          ) : (
            <span className="admin__brand-logo">{initials}</span>
          )}
          <span className="admin__brand-name">
            {storeName}
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
              title={collapsed ? s.label : undefined}
              aria-label={collapsed ? s.label : undefined}
            >
              <span className="admin__navicon"><s.icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" /></span>
              <span className="admin__navlabel">{s.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="admin__collapse"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir panel' : 'Contraer panel'}
          title={`${collapsed ? 'Expandir' : 'Contraer'} panel (Ctrl+B)`}
        >
          {collapsed
            ? <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
            : <PanelLeftClose className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />}
          <span className="admin__navlabel">Contraer panel</span>
        </button>

        <div className="admin__user">
          <b className="admin__user-info">{user?.email || '—'}</b>
          <span className="admin__user-info">Sesión activa</span>
          <Link to="/" className="admin__userlink inline-flex items-center gap-1" title="Ver storefront">
            <span className="admin__navlabel">Ver storefront</span> <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <button className="inline-flex items-center gap-1.5" onClick={handleLogout} title="Cerrar sesión">
            <LogOut className="size-3.5" aria-hidden="true" /> <span className="admin__navlabel">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="admin__main">
        <button className="admin__menu-toggle" onClick={() => setOpen(!open)} aria-label="Menú"><Menu className="size-5" aria-hidden="true" /></button>
        {/* Las páginas hijas (p. ej. Apariencia) leen y actualizan el perfil compartido */}
        <Outlet context={{ profile, setProfile, profileLoading }} />
      </main>
    </div>
  );
}
