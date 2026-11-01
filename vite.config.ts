import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function oraclimeGhPagesPlugin(): Plugin {
  return {
    name: 'oraclime-gh-pages-plugin',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexHtmlPath = path.join(distDir, 'index.html');
      const notFoundHtmlPath = path.join(distDir, '404.html');
      const cnamePath = path.join(distDir, 'CNAME');
      const nojekyllPath = path.join(distDir, '.nojekyll');

      if (fs.existsSync(indexHtmlPath)) {
        fs.copyFileSync(indexHtmlPath, notFoundHtmlPath);
      }
      fs.writeFileSync(cnamePath, 'crm.oraclime.co.in\n', 'utf8');
      fs.writeFileSync(nojekyllPath, '', 'utf8');
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    publicDir: 'public',
    plugins: [react(), tailwindcss(), oraclimeGhPagesPlugin()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
