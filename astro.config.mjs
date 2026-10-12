import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

export default defineConfig({
  // i18n: l'italiano è la lingua base e resta alla root (nessun prefisso /it).
  // Tedesco e inglese vivono sotto /de e /en. prefixDefaultLocale=false mantiene
  // gli URL italiani invariati (/ e /chi-siamo).
  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'de', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    // Il modello 3D del Lanyard (card.glb) viene importato come asset.
    assetsInclude: ['**/*.glb'],
    // DEV: le isole React di Chi siamo e FAQ (freccia 3D, BlurText, titolo
    // hero, accordion…) importano librerie che la home non usa. Senza questa
    // lista Vite le scopriva solo alla prima visita di quelle pagine e le
    // ri-ottimizzava a server acceso: i moduli già serviti diventavano
    // "504 Outdated Optimize Dep", le isole non si idratavano e la pagina
    // restava senza componenti e senza freccia. Dichiararle qui le fa
    // pre-ottimizzare TUTTE all'avvio, in un colpo solo. Se un'isola usata da
    // una pagina importa una nuova libreria, aggiungerla anche qui.
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'gsap',
        'gsap/ScrollTrigger',
        'gsap/SplitText',
        'gsap/Draggable',
        'gsap/InertiaPlugin',
        '@gsap/react',
        'motion/react',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        'lenis',
        'clsx',
        'tailwind-merge',
      ],
    },
  },

  integrations: [react()],
});