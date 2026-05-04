export default function BentoGrid() {
  return (
    <section className="container section" id="servicios">
      <div className="center" style={{ marginBottom: 48 }}>
        <p className="eyebrow fade-in">Por qué elegirnos</p>
        <h2 className="title fade-in fade-in--delay-1" style={{ marginTop: 8 }}>
          Una experiencia premium, de principio a fin.
        </h2>
      </div>

      <div className="bento">
        <div className="bento__cell bento__cell--wide bento__cell--accent fade-in">
          <div>
            <div className="bento__icon">✦</div>
            <h3 className="bento__title">Productos 100% originales con garantía oficial.</h3>
            <p className="bento__desc">
              Trabajamos solo con equipos nuevos y sellados. Nada de imitaciones,
              nada de sorpresas.
            </p>
          </div>
        </div>

        <div className="bento__cell bento__cell--sm fade-in fade-in--delay-1">
          <div>
            <div className="bento__icon">⚡</div>
            <h3 className="bento__title" style={{ fontSize: 20 }}>Entrega rápida.</h3>
            <p className="bento__desc">Coordinamos por WhatsApp.</p>
          </div>
        </div>

        <div className="bento__cell bento__cell--md bento__cell--blue fade-in fade-in--delay-2">
          <div>
            <div className="bento__icon">🔄</div>
            <h3 className="bento__title">Plan canje al instante.</h3>
            <p className="bento__desc">Cotizá tu iPhone usado y descontalo del nuevo en minutos.</p>
          </div>
        </div>

        <div className="bento__cell bento__cell--md fade-in">
          <div>
            <div className="bento__icon">💳</div>
            <h3 className="bento__title">Pagás como te queda mejor.</h3>
            <p className="bento__desc">Pesos, dólares, transferencia. Te asesoramos sin compromiso.</p>
          </div>
        </div>

        <div className="bento__cell bento__cell--sm fade-in fade-in--delay-1">
          <div>
            <div className="bento__icon">★</div>
            <h3 className="bento__title" style={{ fontSize: 20 }}>Atención personalizada.</h3>
            <p className="bento__desc">Hablás con quienes conocen Apple.</p>
          </div>
        </div>

        <div className="bento__cell bento__cell--sm bento__cell--dark fade-in fade-in--delay-2">
          <div>
            <div className="bento__icon">📦</div>
            <h3 className="bento__title" style={{ fontSize: 20 }}>Envíos a todo el país.</h3>
            <p className="bento__desc">Coordinamos logística segura.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
