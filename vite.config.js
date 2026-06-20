import { defineConfig } from 'vite';

// Base relative pour fonctionner sur GitHub Pages (projet) quel que soit
// le nom du dépôt, sans casser les chemins d'assets.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
});
