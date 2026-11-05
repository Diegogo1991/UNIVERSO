import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'recursos-estaticos',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
