// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Scripts and styles of the browser, from client/ to client/dist/. The pages stay rendered by the server (server/pages) : no index.html
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin, Rollup } from 'vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const app = import.meta.dirname;
const client = join(app, 'client');

// what the server serves of the application, besides Vite's build : served at /public/, and Scalar's script for /api/docs
const PUBLIC_FOLDER = join(client, 'public');
const SCALAR_SCRIPT = join(app, 'node_modules/@scalar/api-reference/dist/browser/standalone.js');
const EMBEDDED = join(app, 'server/embedded.ts');

// After each build : server/embedded.ts imports every file the server serves of the application, so that `bun build --compile` takes
// them along, and tells the pages the files of each entry, whose names change with their content.
// From the sources, each import is the file's path on disk; compiled, its path inside the executable
function embedForServer(): Plugin {
  return {
    name: 'soundvitrine:embed-for-server',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir as string;
      const manifest = JSON.parse(String((bundle['.vite/manifest.json'] as Rollup.OutputAsset).source)) as Record<
        string,
        { file: string; css?: string[]; isEntry?: boolean }
      >;

      const files: [string, string][] = [
        ...Object.keys(bundle)
          .filter(name => !name.startsWith('.vite/'))
          .map(name => [`web/${name}`, join(outDir, name)] as [string, string]),
        // Vite's config runs on Node : no Bun.Glob
        ...readdirSync(PUBLIC_FOLDER, { recursive: true, encoding: 'utf8' })
          .filter(name => statSync(join(PUBLIC_FOLDER, name)).isFile())
          .map(name => [`public/${name.replaceAll('\\', '/')}`, join(PUBLIC_FOLDER, name)] as [string, string]),
        ['scalar.js', SCALAR_SCRIPT],
      ];
      files.sort(([a], [b]) => a.localeCompare(b));

      const importPath = (file: string) => {
        const path = relative(join(app, 'server'), file).replaceAll('\\', '/');
        return path.startsWith('.') ? path : `./${path}`;
      };
      const entries = Object.fromEntries(
        Object.entries(manifest)
          .filter(([, chunk]) => chunk.isEntry)
          .map(([name, chunk]) => [name, { file: chunk.file, css: chunk.css ?? [] }]),
      );

      writeFileSync(
        EMBEDDED,
        [
          '// @ts-nocheck : TypeScript knows no type for these imports, which give a path',
          "// Written by Vite's build (vite.config.ts) : what the server serves of the application, by its path",
          '',
          ...files.map(([, file], index) => `import f${index} from ${JSON.stringify(importPath(file))} with { type: 'file' };`),
          '',
          'export const embedded: Record<string, string> = {',
          ...files.map(([key], index) => `  ${JSON.stringify(key)}: f${index},`),
          '};',
          '',
          '// the files of each entry of the build, relative to client/dist/',
          `export const clientEntries: Record<string, { file: string; css: string[] }> = ${JSON.stringify(entries, null, 2)};`,
          '',
        ].join('\n'),
      );
    },
  };
}

export default defineConfig({
  root: client,
  plugins: [tailwindcss(), solid(), embedForServer()],
  // where the server serves client/dist/ (server/static.ts)
  base: '/web/',
  // client/public/ is served as it is, at /public/ : not to be copied into each build
  publicDir: false,
  build: {
    target: 'es2022',
    emptyOutDir: true,
    // read by embedForServer()
    manifest: true,
    rolldownOptions: {
      input: [join(client, 'library/main.tsx'), join(client, 'account/main.tsx')],
    },
  },
});
