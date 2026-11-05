// Scripts and styles of the browser, from client/ to client/dist/. The pages stay rendered by the server (server/pages) : no index.html
import { join } from 'node:path';
import { defineConfig } from 'vite';

const client = join(import.meta.dirname, 'client');

export default defineConfig({
  root: client,
  // where the server serves client/dist/ (server/app.ts)
  base: '/web/',
  // client/public/ is served as it is, at /public/ : not to be copied into each build
  publicDir: false,
  build: {
    target: 'es2022',
    emptyOutDir: true,
    rolldownOptions: {
      input: join(client, 'main.ts'),
    },
  },
});
