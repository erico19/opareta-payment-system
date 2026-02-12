import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: process.env.VITE_AUTH_SERVICE || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, '/auth'),
      },
      '/payments': {
        target: process.env.VITE_PAYMENT_SERVICE || 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/payments/, '/payments'),
      },
      '/webhooks': {
        target: process.env.VITE_PAYMENT_SERVICE || 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/webhooks/, '/webhooks'),
      }
    }
  }
});

