import { useEffect, useMemo, useState } from 'react';
import { supabase, TABLES } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { formatARS } from '../../lib/format';

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); }
function fmtDay(d) { return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }); }

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0, activeProducts: 0, tradeInModels: 0, clients: 0,
    invoices: 0, pending: 0, totalArs: 0,
  });
  const [movements, setMovements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = daysAgo(13).toISOString();
      const [
        { count: products },
        { count: activeProducts },
        { count: tradeInModels },
        { count: clients },
        { data: invoiceList },
        { data: invoicesRange },
        { data: movRange },
      ] = await Promise.all([
        supabase.from(TABLES.products).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.products).select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from(TABLES.tradeIn).select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from(TABLES.clients).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.invoices).select('total_ars, status'),
        supabase.from(TABLES.invoices).select('total_ars, status, created_at').gte('created_at', since),
        supabase.from(TABLES.cashMovements).select('type, amount, occurred_at, category').gte('occurred_at', since),
      ]);
      const inv = invoiceList || [];
      setStats({
        products: products || 0,
        activeProducts: activeProducts || 0,
        tradeInModels: tradeInModels || 0,
        clients: clients || 0,
        invoices: inv.length,
        pending: inv.filter((i) => i.status === 'pendiente').length,
        totalArs: inv.filter((i) => i.status === 'aprobado').reduce((s, i) => s + (Number(i.total_ars) || 0), 0),
      });
      setInvoices(invoicesRange || []);
      setMovements(movRange || []);
      setLoading(false);
    })();
  }, []);

  // Daily series last 14 days
  const days = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const d = startOfDay(daysAgo(13 - i));
      return d;
    });
  }, []);

  const cashSeries = useMemo(() => {
    return days.map((d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const inDay = movements.filter((m) => {
        const t = new Date(m.occurred_at);
        return t >= d && t < next;
      });
      const entrada = inDay.filter((m) => m.type === 'entrada').reduce((s, m) => s + Number(m.amount || 0), 0);
      const salida  = inDay.filter((m) => m.type === 'salida').reduce((s, m) => s + Number(m.amount || 0), 0);
      return { date: d, entrada, salida, balance: entrada - salida };
    });
  }, [days, movements]);

  const invoiceSeries = useMemo(() => {
    return days.map((d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const inDay = invoices.filter((i) => {
        const t = new Date(i.created_at);
        return t >= d && t < next;
      });
      const aprobadas = inDay.filter((i) => i.status === 'aprobado').reduce((s, i) => s + Number(i.total_ars || 0), 0);
      return { date: d, value: aprobadas, count: inDay.length };
    });
  }, [days, invoices]);

  return (
    <>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Hola, Mari ✨</h1>
          <p className="admin__subtitle">Resumen de los últimos 14 días.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stat-grid stat-grid--brand">
            <BrandStat label="Productos activos" value={stats.activeProducts} delta={`de ${stats.products} totales`} tone="violet" />
            <BrandStat label="Modelos de canje" value={stats.tradeInModels} delta="disponibles" tone="pink" />
            <BrandStat label="Clientes" value={stats.clients} delta="en el CRM" tone="blue" />
            <BrandStat label="Facturas aprobadas" value={formatARS(stats.totalArs)} delta={`${stats.pending} pendientes`} tone="green" small />
          </div>

          <div className="dashboard-grid">
            <div className="admin-card chart-card">
              <div className="chart-card__head">
                <div>
                  <h3 className="chart-card__title">Caja diaria</h3>
                  <p className="chart-card__subtitle">Entradas vs salidas — últimos 14 días</p>
                </div>
                <Legend items={[{ color: '#1ea846', label: 'Entradas' }, { color: '#ff5a5f', label: 'Salidas' }]} />
              </div>
              <BarChart series={cashSeries} />
            </div>

            <div className="admin-card chart-card">
              <div className="chart-card__head">
                <div>
                  <h3 className="chart-card__title">Facturación aprobada</h3>
                  <p className="chart-card__subtitle">Total ARS por día</p>
                </div>
                <Legend items={[{ color: 'var(--brand-violet)', label: 'ARS' }]} />
              </div>
              <LineChart series={invoiceSeries} color="var(--brand-violet)" />
            </div>
          </div>

          <div className="admin-card">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Acciones rápidas</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/admin/inventory" className="btn btn--primary">+ Nuevo producto</Link>
              <Link to="/admin/cash" className="btn btn--ghost">+ Movimiento de caja</Link>
              <Link to="/admin/invoices" className="btn btn--ghost">+ Nueva factura</Link>
              <Link to="/admin/clients" className="btn btn--ghost">+ Nuevo cliente</Link>
              <Link to="/admin/trade-in" className="btn btn--ghost">Configurar canje</Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function BrandStat({ label, value, delta, tone = 'violet', small }) {
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value" style={small ? { fontSize: 24 } : undefined}>{value}</div>
      <div className="stat__delta">{delta}</div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label} className="legend__item">
          <span className="legend__dot" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function BarChart({ series }) {
  const max = Math.max(1, ...series.map((d) => Math.max(d.entrada || 0, d.salida || 0)));
  return (
    <div className="bars">
      {series.map((d, i) => (
        <div key={i} className="bars__col" title={`${fmtDay(d.date)}: +${formatARS(d.entrada)} / -${formatARS(d.salida)}`}>
          <div className="bars__pair">
            <div className="bars__bar bars__bar--in" style={{ height: `${(d.entrada / max) * 100}%` }} />
            <div className="bars__bar bars__bar--out" style={{ height: `${(d.salida / max) * 100}%` }} />
          </div>
          <span className="bars__label">{fmtDay(d.date)}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ series, color = 'var(--brand-violet)' }) {
  const W = 600, H = 200, P = 24;
  const max = Math.max(1, ...series.map((d) => d.value || 0));
  const stepX = (W - P * 2) / Math.max(1, series.length - 1);
  const points = series.map((d, i) => {
    const x = P + i * stepX;
    const y = H - P - (d.value / max) * (H - P * 2);
    return [x, y];
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L ${points[points.length-1][0].toFixed(1)} ${H-P} L ${P} ${H-P} Z`;
  return (
    <div className="line-chart-wrap">
      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={P} x2={W-P} y1={H - P - t * (H - P * 2)} y2={H - P - t * (H - P * 2)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />
        ))}
        <path d={area} fill="url(#lineFill)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--bg-primary)" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="line-chart__labels">
        {series.map((d, i) => i % 2 === 0 ? <span key={i}>{fmtDay(d.date)}</span> : <span key={i} />)}
      </div>
    </div>
  );
}
