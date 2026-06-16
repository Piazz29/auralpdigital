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
  },

  integrations: [react()],
});