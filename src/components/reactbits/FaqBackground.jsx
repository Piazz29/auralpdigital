import { useEffect, useState } from 'react';
import DotGrid from './DotGrid.jsx';

/**
 * Sfondo DotGrid della pagina FAQ, calibrato lato client per performance e
 * accessibilità. Decide a runtime (matchMedia) l'intensità:
 *  - reduced-motion o schermi molto piccoli (<480px) → DotGrid STATICO (campo di
 *    punti calmo, nessun listener/animazione);
 *  - mobile (<768px) → griglia più rada e dot più piccoli, interazione morbida;
 *  - desktop → configurazione piena, sobria e brand-consistent.
 * I dot di base sono grigio chiaro, gli attivi blu del brand: effetto soft,
 * leggibile, mai arcade.
 */
export default function FaqBackground() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    const compute = () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const w = window.innerWidth;
      const tiny = w < 480;
      const mobile = w < 768;

      setCfg({
        interactive: !(reduce || tiny),
        dotSize: mobile ? 4 : 5,
        gap: mobile ? 38 : 30,
        proximity: mobile ? 100 : 130,
        shockRadius: 220,
        shockStrength: 3,
        returnDuration: 1.4
      });
    };

    compute();
    // Ricalcola solo su resize "vero" (rotazione/ridimensionamento finestra).
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(compute, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  if (!cfg) return null;

  return (
    <DotGrid
      dotSize={cfg.dotSize}
      gap={cfg.gap}
      baseColor="#D8D3B7"
      activeColor="#D84002"
      proximity={cfg.proximity}
      shockRadius={cfg.shockRadius}
      shockStrength={cfg.shockStrength}
      returnDuration={cfg.returnDuration}
      interactive={cfg.interactive}
    />
  );
}
