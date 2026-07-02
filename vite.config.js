import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Base relative pour fonctionner sur GitHub Pages (projet) quel que soit
// le nom du dépôt, sans casser les chemins d'assets.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
});
