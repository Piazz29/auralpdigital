import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

export default defineConfig({
  // Origine canonica: la usano canonical, hreflang, Open Graph, JSON-LD,
  // sitemap, robots e llms.txt (src/lib/seo.ts). Quando si collega il dominio
  // definitivo basta cambiare QUESTA riga (e il valore di
  // Access-Control-Allow-Origin in vercel.json).
  site: 'https://www.auralpdigital.com',

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
    // DEV: cache delle dipendenze SEPARATA da quella di build/sync. Con una
    // cache sola, un `npm run build` (o un secondo `astro dev`) lanciato a
    // server acceso riscriveva node_modules/.vite/deps sotto i piedi del dev
    // server: la pagina caricava due copie di React con hash diversi
    // ("Cannot read properties of null (reading 'useContext')") e le isole
    // di Chi siamo non partivano — titolo, percorso e card spariti.
    // Va tenuto UN solo `astro dev` acceso alla volta.
    cacheDir: process.argv.includes('dev') ? 'node_modules/.vite-dev' : 'node_modules/.vite',
    // Il modello 3D del Lanyard (card.glb) viene importato come asset.
    assetsInclude: ['**/*.glb'],
    // Il minificatore CSS di Astro 7 scrive le media query in sintassi range
    // (`width<=767px`), che Safari < 16.4 ignora: su iPhone meno recenti
    // salterebbe tutto il responsive. Con questo target torna `max-width`.
    build: {
      cssTarget: ['chrome107', 'edge107', 'firefox104', 'safari15'],
    },
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
        'three/examples/jsm/lines/Line2.js',
        'three/examples/jsm/lines/LineGeometry.js',
        'three/examples/jsm/lines/LineMaterial.js',
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