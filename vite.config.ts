/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { compression } from 'vite-plugin-compression2';

/** Vite config + Vitest `test` block (UserConfig doesn't include it). */
type ViteConfig = import('vite').UserConfig & {
  test?: { environment?: string; globals?: boolean; setupFiles?: string[] };
};

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
    compression({ algorithms: ['gzip', 'brotliCompress'], threshold: 1024 }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  server: { port: 3000 },
  build: {
    outDir: 'dist',
    commonjsOptions: { transformMixedEsModules: true },
    chunkSizeWarningLimit: 600,
  },
  worker: { format: 'iife' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
  },
} as ViteConfig);
