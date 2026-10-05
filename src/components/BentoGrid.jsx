import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, CreditCard, MessageCircle, Package, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getScrollBehavior } from '../lib/sections';

const ICONS = {
  shield: ShieldCheck,
  bolt: Zap,
  refresh: RefreshCw,
  card: CreditCard,
  chat: MessageCircle,
  box: Package,
  badge: BadgeCheck,
};

const CELLS = [
  { icon: 'shield',  size: 'wide', tone: 'feature', title: 'Productos 100% originales con garantía oficial.', desc: 'Trabajamos solo con equipos nuevos y sellados. Nada de imitaciones, nada de sorpresas.' },
  { icon: 'bolt',    size: 'sm',                     title: 'Entrega rápida.', desc: 'Coordinamos por WhatsApp.', small: true },
  { icon: 'refresh', size: 'md',   tone: 'accent',  title: 'Plan canje al instante.', desc: 'Cotizá tu iPhone usado y descontalo del nuevo en minutos.' },
  { icon: 'card',    size: 'md',                     title: 'Pagás como te queda mejor.', desc: 'Pesos, dólares, transferencia. Te asesoramos sin compromiso.' },
  { icon: 'chat',    size: 'sm',                     title: 'Atención personalizada.', desc: 'Hablás con quienes conocen Apple.', small: true },
  { icon: 'box',     size: 'sm',                     title: 'Envíos a todo el país.', desc: 'Coordinamos logística segura.', small: true },
  { icon: 'badge',   size: 'sm',                     title: 'Garantía oficial 12 meses.', desc: 'Todos los equipos cubiertos por garantía Apple ante defectos de fábrica.', small: true },
];

const DELAYS = ['', 'fade-in--delay-1', 'fade-in--delay-2'];

// En el celular la grilla muestra columnas de 3 tarjetas con scroll horizontal (snap-scroll.css)
const CELLS_PER_GROUP = 3;
const GROUP_COUNT = Math.ceil(CELLS.length / CELLS_PER_GROUP);

/** Grupo de tarjetas visible en la tira horizontal del celular, y cómo saltar a otro. */
function useBentoGroups(trackRef) {
  const [activeGroup, setActiveGroup] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const cells = track.children;
      const groupWidth = cells[CELLS_PER_GROUP] ? cells[CELLS_PER_GROUP].offsetLeft - cells[0].offsetLeft : 0;
      if (groupWidth > 0) setActiveGroup(Math.round(track.scrollLeft / groupWidth));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    track.addEventListener('scroll', schedule, { passive: true });
    return () => {
      track.removeEventListener('scroll', schedule);
      cancelAnimationFrame(frame);
    };
  }, [trackRef]);

  const goToGroup = (group) => {
    const track = trackRef.current;
    const cell = track?.children[group * CELLS_PER_GROUP];
    if (!cell) return;
    const paddingLeft = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    track.scrollTo({ left: cell.offsetLeft - paddingLeft, behavior: getScrollBehavior() });
  };

  return { activeGroup, goToGroup };
}

function BentoIcon({ name }) {
  const Icon = ICONS[name];
  return (
    <div className="bento__icon" aria-hidden="true">
      <Icon strokeWidth={1.75} />
    </div>
  );
}

export default function BentoGrid() {
  const trackRef = useRef(null);
  const { activeGroup, goToGroup } = useBentoGroups(trackRef);

  return (
    <section className="section bento-section snap-slide" id="servicios">
      <div className="container">
        <div className="center bento-section__head">
          <p className="eyebrow fade-in">Por qué elegirnos</p>
          <h2 className="title fade-in fade-in--delay-1" style={{ marginTop: 8 }}>
            Una experiencia premium, de principio a fin.
          </h2>
        </div>

        <div className="bento" ref={trackRef}>
          {CELLS.map((cell, i) => (
            <Card
              key={cell.title}
              className={[
                'bento__cell',
                `bento__cell--${cell.size}`,
                cell.tone && `bento__cell--${cell.tone}`,
                'fade-in',
                DELAYS[i % DELAYS.length],
              ].filter(Boolean).join(' ')}
            >
              <div>
                <BentoIcon name={cell.icon} />
                <h3 className={`bento__title ${cell.small ? 'bento__title--sm' : ''}`}>{cell.title}</h3>
                <p className="bento__desc">{cell.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Solo visible en el celular: permite pasar de grupo también con el mouse */}
        <div className="bento-pager" role="group" aria-label="Grupos de tarjetas">
          {Array.from({ length: GROUP_COUNT }, (_, group) => {
            const isActive = group === activeGroup;
            return (
              <button
                key={group}
                type="button"
                className={`bento-pager__btn ${isActive ? 'is-active' : ''}`}
                aria-label={`Ver tarjetas ${group + 1} de ${GROUP_COUNT}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => goToGroup(group)}
              >
                <span className="bento-pager__dot" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
