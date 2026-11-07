// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Scripts and styles of the browser, from client/ to client/dist/. The pages stay rendered by the server (server/pages) : no index.html
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const client = join(import.meta.dirname, 'client');

export default defineConfig({
  root: client,
  plugins: [tailwindcss(), solid()],
  // where the server serves client/dist/ (server/static.ts)
  base: '/web/',
  // client/public/ is served as it is, at /public/ : not to be copied into each build
  publicDir: false,
  build: {
    target: 'es2022',
    emptyOutDir: true,
    // how the pages find the entry, whose name changes with its content (server/pages/layout.ts)
    manifest: true,
    rolldownOptions: {
      input: [join(client, 'library/main.tsx'), join(client, 'account/main.tsx')],
    },
  },
});
