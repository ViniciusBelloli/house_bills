import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

const MONOREPO_ROOT = resolve(__dirname, '../..');

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      // Allow imports from the monorepo root (needed for data/*.json glob)
      allow: [MONOREPO_ROOT],
    },
  },
  // Base path for GitHub Pages — update to /repo-name/ when deploying
  base: process.env.GITHUB_PAGES === 'true' ? '/house_bills/' : '/',
});
