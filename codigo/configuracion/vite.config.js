import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'recursos-estaticos',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      // La página solo carga el inicio. El universo 3D va como entrada aparte para
      // que se siga compilando (y revisando) aunque PLAY aún no lo importe.
      input: {
        index: fileURLToPath(new URL('../../index.html', import.meta.url)),
        juego: fileURLToPath(new URL('../nave/main.js', import.meta.url))
      }
    }
  }
});
