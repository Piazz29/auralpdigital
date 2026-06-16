import { useState } from 'react';
import CardSwap, { Card } from './CardSwap.jsx';
import './FlowCardSwap.css';

/**
 * Wrapper d'integrazione per Astro: CardSwap + Card vanno composti dentro
 * un unico componente React (Astro non può passare componenti React come
 * figli di un'altra isola). Riceve i 4 punti del metodo come `items`.
 *
 * Le card si avvicendano da sole e al click; un hint "Clicca per scorrere"
 * resta visibile finché l'utente non interagisce la prima volta.
 */
export default function FlowCardSwap({
  items = [],
  width = 460,
  height = 340,
  cardDistance = 60,
  verticalDistance = 78,
  delay = 4200
}) {
  const [interacted, setInteracted] = useState(false);

  return (
    <div className="flow-swap-wrap">
      <CardSwap
        width={width}
        height={height}
        cardDistance={cardDistance}
        verticalDistance={verticalDistance}
        delay={delay}
        pauseOnHover
        skewAmount={5}
        easing="elastic"
        onCardClick={() => setInteracted(true)}
      >
        {items.map((w, i) => (
          <Card key={i} customClass="flow-swap-card">
            <div className="flow-swap-top">
              <span className="flow-swap-n">{w.n}</span>
              <span className="flow-swap-tag">{w.tag}</span>
            </div>
            <h3 className="flow-swap-title">
              {w.title} <em>{w.titleEm}</em>
            </h3>
            <p className="flow-swap-text">{w.text}</p>
          </Card>
        ))}
      </CardSwap>

      <span
        className={'flow-swap-hint' + (interacted ? ' is-hidden' : '')}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 11V6.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v4.5a5 5 0 0 1-5 5h-1.6a4 4 0 0 1-3.1-1.5L5 17.5a1.6 1.6 0 0 1 2.3-2.2l1.7 1.5V11"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Clicca per scorrere
      </span>
    </div>
  );
}
