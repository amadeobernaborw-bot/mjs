import { Link } from 'react-router-dom';
import { Package, Receipt, RefreshCw, Sparkles, UserPlus, Wallet } from 'lucide-react';
import WidgetPanel from '@/components/widgets/WidgetPanel';
import { PeriodProvider, PeriodToggle, usePeriod } from '@/components/dashboard/PeriodContext';
import { INICIO_PRESETS, inicioRegistry } from './inicio/widgets';
import { SCREEN } from './inicio/catalog';

const QUICK_ACTIONS = [
  { to: '/admin/inventory', label: 'Producto', icon: Package },
  { to: '/admin/cash',      label: 'Caja',     icon: Wallet },
  { to: '/admin/invoices',  label: 'Factura',  icon: Receipt },
  { to: '/admin/clients',   label: 'Cliente',  icon: UserPlus },
  { to: '/admin/trade-in',  label: 'Canje',    icon: RefreshCw },
];

/** Padding inferior de .admin__main: el encuadre de 8 filas termina justo antes. */
function mainBottomPadding(el) {
  const main = el.closest('.admin__main');
  return main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
}

function Greeting() {
  const { period } = usePeriod();
  return (
    <div>
      <h1 className="admin__title inline-flex items-center gap-2">
        Hola, Mari <Sparkles className="size-6 text-brand" strokeWidth={1.75} aria-hidden="true" />
      </h1>
      <p className="admin__subtitle">Resumen de los últimos {period.label.toLowerCase()}.</p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <PeriodProvider>
      <nav className="quick-actions-bar" aria-label="Acciones rápidas">
        <div className="quick-actions-bar__inner">
          {QUICK_ACTIONS.map((a, idx) => (
            <Link key={a.to} to={a.to} className={`quick-actions-bar__btn quick-actions-bar__btn--c${idx % 5} gap-2`}>
              <a.icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
              <span className="quick-actions-bar__label">{a.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <WidgetPanel
        screen={SCREEN}
        registry={inicioRegistry}
        presets={INICIO_PRESETS}
        leading={<Greeting />}
        toolbar={<PeriodToggle />}
        frameBottomOffset={mainBottomPadding}
      />
    </PeriodProvider>
  );
}
