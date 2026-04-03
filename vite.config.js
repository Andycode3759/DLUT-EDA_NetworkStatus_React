import { readdirSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKGROUND_DIR = resolve(process.cwd(), 'public/background');
const BACKGROUND_INDEX_FILE = 'background-images.json';
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

function getBackgroundImages() {
  if (!existsSync(BACKGROUND_DIR)) {
    return [];
  }

  return readdirSync(BACKGROUND_DIR)
    .filter((name) => SUPPORTED_EXTENSIONS.has(extname(name).toLowerCase()))
    .sort()
    .map((name) => `/background/${name}`);
}

function backgroundImagesIndexPlugin() {
  return {
    name: 'background-images-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url ? req.url.split('?')[0] : '';
        const rootPath = `/${BACKGROUND_INDEX_FILE}`;
        const basePath = `${server.config.base}${BACKGROUND_INDEX_FILE}`;

        if (requestPath !== rootPath && requestPath !== basePath) {
          next();
          return;
        }

        const body = JSON.stringify(getBackgroundImages());
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(body);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: BACKGROUND_INDEX_FILE,
        source: JSON.stringify(getBackgroundImages(), null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), backgroundImagesIndexPlugin()],
});
