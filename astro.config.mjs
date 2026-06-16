import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    // Il modello 3D del Lanyard (card.glb) viene importato come asset.
    assetsInclude: ['**/*.glb'],
  },

  integrations: [react()],
});