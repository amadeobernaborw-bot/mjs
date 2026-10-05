import { createContext, useContext, useMemo, useState } from 'react';

export const RANGE_OPTIONS = [
  { value: '7d',   label: '7 días',  days: 7,   labelEvery: 1 },
  { value: '30d',  label: '1 mes',   days: 30,  labelEvery: 3 },
  { value: '90d',  label: '3 meses', days: 90,  labelEvery: 7 },
  { value: '180d', label: '6 meses', days: 180, labelEvery: 15 },
  { value: '365d', label: '1 año',   days: 365, labelEvery: 30 },
];

const DEFAULT_RANGE = '30d';

const PeriodContext = createContext(null);

/** Filtro global de período del Inicio: los widgets lo leen con usePeriod(). */
export function PeriodProvider({ children }) {
  const [range, setRange] = useState(DEFAULT_RANGE);
  const value = useMemo(() => ({
    range,
    setRange,
    period: RANGE_OPTIONS.find((r) => r.value === range) || RANGE_OPTIONS[1],
  }), [range]);
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod() tiene que usarse dentro de <PeriodProvider>');
  return ctx;
}

export function PeriodToggle() {
  const { range, setRange } = usePeriod();
  return (
    <div className="range-toggle" role="radiogroup" aria-label="Período">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={range === opt.value}
          className={`range-toggle__btn ${range === opt.value ? 'is-active' : ''}`}
          onClick={() => setRange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
