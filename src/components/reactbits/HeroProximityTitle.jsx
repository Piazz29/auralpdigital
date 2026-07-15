'use client';

// HeroProximityTitle — wrapper per il titolo della hero di /chi-siamo. Renderizza
// i segmenti del titolo (normale + accento corsivo) come VariableProximity che
// condividono UN solo containerRef, così l'effetto di prossimità è calcolato
// rispetto all'intero titolo e l'accento del brand è preservato. Una sola isola
// React (Astro non può condividere un ref tra isole separate).
//
// ENTRATA split-text: le lettere (già spans, li crea VariableProximity) salgono
// e si mettono a fuoco in cascata via WAAPI DOPO l'idratazione — GSAP da
// main.ts qui rischierebbe una race con l'hydration di React sugli stessi
// nodi. L'h1 parte con opacity:0 inline (stesso pattern anti-flash di badge/
// sub/meta) e viene riesposto nello stesso frame in cui parte la cascata;
// reduced-motion → titolo subito visibile, nessuna animazione.

import { useEffect, useRef } from 'react';
import VariableProximity from './VariableProximity.jsx';

export default function HeroProximityTitle({ parts = [], radius = 130 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const wrap = containerRef.current;
    const h1 = wrap?.closest('.ap-hero-title');
    if (!wrap) return;
    const reveal = () => {
      if (h1) h1.style.opacity = '1';
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const letters = wrap.querySelectorAll('span[aria-hidden]');
    if (reduce || !letters.length || !('animate' in Element.prototype)) {
      reveal();
      return;
    }
    letters.forEach((el, i) => {
      // fill:'backwards' nasconde la lettera dal momento della chiamata fino
      // al suo delay → la cascata parte da uno stato pulito, senza flash.
      el.animate(
        [
          {
            opacity: 0,
            transform: 'translateY(0.5em) rotate(2deg)',
            filter: 'blur(7px)',
          },
          { opacity: 1, transform: 'translateY(0) rotate(0deg)', filter: 'blur(0px)' },
        ],
        {
          duration: 850,
          delay: 220 + i * 22,
          easing: 'cubic-bezier(0.19, 1, 0.22, 1)',
          fill: 'backwards',
        }
      );
    });
    reveal();
  }, []);

  return (
    <span
      ref={containerRef}
      className="ap-hero-prox-wrap"
      style={{ position: 'relative', display: 'inline' }}
    >
      {parts.map((part, i) => (
        <VariableProximity
          key={i}
          label={part.text}
          className={`ap-hero-prox${part.accent ? ' ap-hero-accent' : ''}`}
          fromFontVariationSettings="'wght' 500"
          toFontVariationSettings="'wght' 700"
          containerRef={containerRef}
          radius={radius}
          falloff="gaussian"
          // L'accento vive su una riga propria, indentata (righe sfalsate):
          // VariableProximity forza display:inline INLINE, quindi il block va
          // passato da qui — una regola CSS non lo batterebbe mai.
          style={part.accent ? { display: 'block' } : undefined}
        />
      ))}
    </span>
  );
}
