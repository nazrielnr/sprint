import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks cache across deploys; app code changes far more often.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/react-dom|react-router|[\\/]react[\\/]|scheduler/.test(id)) return 'react';
          if (id.includes('@tanstack')) return 'query';
          if (id.includes('@radix-ui')) return 'radix';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
