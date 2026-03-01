import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: '/',

    plugins: [
      react(),
      nodePolyfills({
        protocolImports: true,
      }),
    ],

    define: {
      global: 'globalThis',
      process: 'process',
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
