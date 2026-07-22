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

    // FIT-TO-WIDTH: le righe del titolo sono nowrap — se la più lunga eccede
    // la colonna (succede in de/en, più prolissi dell'italiano), il titolo
    // scala IN BLOCCO del minimo necessario. Content-aware: quando il clamp
    // CSS basta (it), il fattore è 1 e non tocca nulla. Il buffer 0.98 assorbe
    // l'allargamento delle lettere sotto il cursore (wght 500→700).
    const fit = () => {
      if (!h1) return;
      h1.style.fontSize = ''; // rimisura sempre dalla base CSS (clamp)
      const base = parseFloat(getComputedStyle(h1).fontSize);
      let scale = 1;
      wrap.querySelectorAll(':scope > span').forEach((line) => {
        if (line.scrollWidth > 0) {
          scale = Math.min(scale, line.clientWidth / line.scrollWidth);
        }
      });
      if (scale < 1) h1.style.fontSize = `${(base * scale * 0.98).toFixed(2)}px`;
    };
    fit();
    // I metrics cambiano quando arriva il font display: rimisura a font pronti
    // e a ogni resize (ricalcolo leggero: due letture layout, una scrittura).
    document.fonts?.ready?.then(fit);
    window.addEventListener('resize', fit);
    const cleanup = () => window.removeEventListener('resize', fit);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const letters = wrap.querySelectorAll('span[aria-hidden]');
    if (reduce || !letters.length || !('animate' in Element.prototype)) {
      reveal();
      return cleanup;
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
    return cleanup;
  }, []);

  // Le righe del titolo sono ESPLICITE (part.line, dal "\n" nel dizionario):
  // ogni riga diventa un blocco white-space:nowrap → il titolo occupa sempre
  // esattamente quelle righe, il wrapping non può mai spezzarle ("dietro i
  // pixel" resta unito su ogni breakpoint). L'accento resta inline nella
  // propria riga.
  const lines = [];
  parts.forEach((part) => {
    const li = part.line ?? 0;
    (lines[li] ||= []).push(part);
  });

  return (
    <span
      ref={containerRef}
      className="ap-hero-prox-wrap"
      style={{ position: 'relative', display: 'block' }}
    >
      {lines.map((lineParts, li) => (
        <span key={li} style={{ display: 'block', whiteSpace: 'nowrap' }}>
          {lineParts.map((part, i) => (
            <VariableProximity
              key={i}
              label={part.text}
              className={`ap-hero-prox${part.accent ? ' ap-hero-accent' : ''}`}
              fromFontVariationSettings="'wght' 500"
              toFontVariationSettings="'wght' 700"
              containerRef={containerRef}
              radius={radius}
              falloff="gaussian"
            />
          ))}
        </span>
      ))}
    </span>
  );
}
