import { formatARS } from '../../../lib/format';

// Serie categórica por tema (--chart-1…8 en design-system.css): ≥3:1 contra la tarjeta en ambos temas.
export const PALETTE = Array.from({ length: 8 }, (_, i) => `var(--chart-${i + 1})`);

function fmtDay(d) { return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }); }

export function Legend({ items }) {
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

export function BarChart({ series, compact = false, labelEvery = 1 }) {
  const max = Math.max(1, ...series.map((d) => Math.max(d.entrada || 0, d.salida || 0)));
  return (
    <div className={`bars ${compact ? 'bars--compact' : ''}`}>
      {series.map((d, i) => (
        <div key={i} className="bars__col" title={`${fmtDay(d.date)}: +${formatARS(d.entrada)} / -${formatARS(d.salida)}`}>
          <div className="bars__pair">
            <div className="bars__bar bars__bar--in" style={{ height: `${(d.entrada / max) * 100}%` }} />
            <div className="bars__bar bars__bar--out" style={{ height: `${(d.salida / max) * 100}%` }} />
          </div>
          {i % labelEvery === 0 && <span className="bars__label">{fmtDay(d.date)}</span>}
        </div>
      ))}
    </div>
  );
}

export function LineChart({ series, color = 'var(--chart-1)', labelEvery = 2 }) {
  const W = 600, H = 200, P = 24;
  const values = series.map((d) => d.value || 0);
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const stepX = (W - P * 2) / Math.max(1, series.length - 1);
  const midY = H / 2;
  const points = series.map((d, i) => {
    const x = P + i * stepX;
    const y = midY - (d.value / max) * (H / 2 - P);
    return [x, y];
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = points.length > 0
    ? `${path} L ${points[points.length-1][0].toFixed(1)} ${midY} L ${P} ${midY} Z`
    : '';
  const lineId = `lineFill-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <div className="line-chart-wrap">
      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={lineId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.35 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <line x1={P} x2={W-P} y1={midY} y2={midY} style={{ stroke: 'var(--border-medium)' }} strokeDasharray="3 4" />
        {area && <path d={area} fill={`url(#${lineId})`} />}
        {path && <path d={path} fill="none" style={{ stroke: color }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {points.length <= 60 && points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" style={{ fill: 'var(--surface-card)', stroke: color }} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="line-chart__labels">
        {series.map((d, i) => i % labelEvery === 0 ? <span key={i}>{fmtDay(d.date)}</span> : <span key={i} />)}
      </div>
    </div>
  );
}

export function PieChart({ data, formatValue = (v) => v }) {
  const W = 220, H = 220, cx = 110, cy = 110, R = 90, r = 50;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const slices = data.map((d, i) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.value;
    // Un arco de 360° tiene inicio y fin en el mismo punto y SVG no lo dibuja
    const end = Math.min((acc / total) * Math.PI * 2, Math.PI * 2 - 0.0001) - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const x3 = cx + r * Math.cos(end),   y3 = cy + r * Math.sin(end);
    const x4 = cx + r * Math.cos(start), y4 = cy + r * Math.sin(start);
    const path = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
    const color = PALETTE[i % PALETTE.length];
    return { path, color, name: d.name, value: d.value, pct: (d.value / total) * 100 };
  });
  return (
    <div className="pie-chart-wrap">
      <svg className="pie-chart" viewBox={`0 0 ${W} ${H}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} style={{ fill: s.color, stroke: 'var(--surface-card)' }} strokeWidth="1.5">
            <title>{`${s.name}: ${formatValue(s.value)} (${s.pct.toFixed(1)}%)`}</title>
          </path>
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" style={{ fill: 'var(--text-tertiary)' }}>Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="14" fontWeight="700" style={{ fill: 'var(--text-primary)' }}>{formatValue(total)}</text>
      </svg>
      <ul className="pie-chart__legend">
        {slices.map((s, i) => (
          <li key={i}>
            <span className="pie-chart__swatch" style={{ background: s.color }} />
            <span className="pie-chart__name">{s.name}</span>
            <span className="pie-chart__val">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBarChart({ data, formatValue = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="hbar">
      {data.map((d, i) => (
        <li key={i} className="hbar__row">
          <span className="hbar__name" title={d.name}>{d.name}</span>
          <span className="hbar__track">
            <span className="hbar__fill" style={{ width: `${(d.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
          </span>
          <span className="hbar__val">{formatValue(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Dos barras por fila (entrada en --success, salida en --danger) sobre una
 * misma escala. data: [{ name, entrada, salida }].
 */
export function PairedBars({ data, formatValue = (v) => v, labels = { entrada: 'Entradas', salida: 'Salidas' } }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.entrada || 0, d.salida || 0)));
  return (
    <ul className="paired-bars">
      {data.map((d) => (
        <li key={d.name} className="paired-bars__row">
          <span className="paired-bars__name" title={d.name}>{d.name}</span>
          <span className="paired-bars__tracks">
            <span className="paired-bars__track" title={`${labels.entrada}: ${formatValue(d.entrada)}`}>
              <span className="paired-bars__fill paired-bars__fill--in" style={{ width: `${((d.entrada || 0) / max) * 100}%` }} />
            </span>
            <span className="paired-bars__track" title={`${labels.salida}: ${formatValue(d.salida)}`}>
              <span className="paired-bars__fill paired-bars__fill--out" style={{ width: `${((d.salida || 0) / max) * 100}%` }} />
            </span>
          </span>
          <span className="paired-bars__vals">
            <span className="paired-bars__val--in">+{formatValue(d.entrada)}</span>
            <span className="paired-bars__val--out">−{formatValue(d.salida)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
