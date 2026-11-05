// Scripts and styles of the browser, from web/ to dist/. The pages stay rendered by the server (src/pages) : no index.html
import { join } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: join(import.meta.dirname, 'web'),
  build: {
    outDir: join(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    rolldownOptions: {
      input: join(import.meta.dirname, 'web/main.ts'),
    },
  },
});
