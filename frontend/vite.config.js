import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api/* to the Express backend during development so the
// frontend can call fetch('/api/...') without hardcoding a host.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
