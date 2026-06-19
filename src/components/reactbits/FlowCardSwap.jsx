import { useEffect, useRef, useState } from 'react';
import CardSwap, { Card } from './CardSwap.jsx';
import './FlowCardSwap.css';

/**
 * Wrapper d'integrazione per Astro: CardSwap + Card vanno composti dentro
 * un unico componente React (Astro non può passare componenti React come
 * figli di un'altra isola). Riceve i 4 punti del metodo come `items`.
 *
 * Comportamento (richiesto dal brief):
 *  - Le card avanzano SOLO al click oppure automaticamente dopo 10s d'inattività
 *    (`delay`); ogni click resetta il timer di autoplay (gestito in CardSwap).
 *  - L'hint (`hint`, localizzato dagli i18n) è solo testo leggero, ancorato sopra
 *    il bordo inferiore della prima card. Sparisce al primo click e ricompare
 *    dopo 15s se l'utente non ha più cliccato.
 */
export default function FlowCardSwap({
  items = [],
  hint: hintLabel = 'Scorri le schede',
  width = 460,
  height = 340,
  cardDistance = 60,
  verticalDistance = 78,
  delay = 10000
}) {
  const [hintHidden, setHintHidden] = useState(false);
  const hintTimer = useRef(null);

  // Pulizia del timer dell'hint allo smontaggio.
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const handleCardClick = () => {
    setHintHidden(true);
    clearTimeout(hintTimer.current);
    // Ricompare solo dopo 15s senza nuovi click.
    hintTimer.current = setTimeout(() => setHintHidden(false), 15000);
  };

  const hint = (
    <span
      className={'flow-swap-hint' + (hintHidden ? ' is-hidden' : '')}
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
      {hintLabel}
    </span>
  );

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
        onCardClick={handleCardClick}
        overlay={hint}
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
    </div>
  );
}
