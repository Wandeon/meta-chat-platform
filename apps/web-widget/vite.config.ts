import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/loader.tsx',
      name: 'MetaChatWidget',
      formats: ['iife', 'es'],
      fileName: (format) => (format === 'es' ? 'widget.es.js' : 'widget.js'),
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    sourcemap: true,
    cssCodeSplit: false,
  },
  server: {
    port: 5174,
  },
});
