'use client';

// HeroProximityTitle — wrapper per il titolo della hero di /chi-siamo. Renderizza
// i segmenti del titolo (normale + accento corsivo) come VariableProximity che
// condividono UN solo containerRef, così l'effetto di prossimità è calcolato
// rispetto all'intero titolo e l'accento del brand è preservato. Una sola isola
// React (Astro non può condividere un ref tra isole separate).

import { useRef } from 'react';
import VariableProximity from './VariableProximity.jsx';

export default function HeroProximityTitle({ parts = [], radius = 130 }) {
  const containerRef = useRef(null);

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
        />
      ))}
    </span>
  );
}
