// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Vite's build, and the API's reference

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { handle } from '../app';
import { APP_ROOT } from '../config';
import { clientEntryIn } from '../pages/layout';
import { base, prepareTestUser } from './helpers';

beforeAll(prepareTestUser);

describe("Vite's build", () => {
  test('pages find its entry in the manifest', () => {
    const entry = { file: 'assets/main-abc.js', css: ['assets/main-def.css'], isEntry: true };
    expect(clientEntryIn(JSON.stringify({ 'library/main.tsx': entry }))).toEqual(entry);
    expect(clientEntryIn(JSON.stringify({ 'account/main.ts': entry }), 'account/main.ts')).toEqual(entry);
    expect(clientEntryIn('{}')).toBeUndefined();
  });

  // a file of its own : client/dist/ only exists after a build, and tests must not depend on one
  const folder = join(APP_ROOT, 'client', 'dist', 'assets');
  const file = join(folder, 'test-served.js');

  beforeAll(() => {
    mkdirSync(folder, { recursive: true });
    writeFileSync(file, 'served');
  });
  afterAll(() => rmSync(file, { force: true }));

  test('is served at /web/, kept forever', async () => {
    const response = await handle(new Request(`${base}/web/assets/test-served.js`));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toStartWith('text/javascript');
    expect(response.headers.get('cache-control')).toContain('immutable');
    expect(await response.text()).toBe('served');
  });

  test('serves nothing else', async () => {
    for (const path of ['/web/assets/missing.js', '/web/..%2fmain.ts', '/web/%2e%2e/%2e%2e/package.json']) {
      expect((await handle(new Request(`${base}${path}`))).status).toBe(404);
    }
    expect((await handle(new Request(`${base}/web/assets/test-served.js`, { method: 'POST' }))).status).not.toBe(200);
  });
});

describe('API reference', () => {
  interface Operation {
    responses: Record<string, { content?: Record<string, unknown> }>;
    requestBody?: { content: Record<string, unknown> };
  }

  test('the OpenAPI document describes what SoundBuddy calls', async () => {
    const document = (await (await handle(new Request(`${base}/api/openapi.json`))).json()) as {
      openapi: string;
      paths: Record<string, Record<string, Operation>>;
    };
    expect(document.openapi).toStartWith('3.');

    const { paths } = document;
    expect(paths['/hb/creds']?.post?.responses['403']?.content?.['text/plain']).toBeDefined();
    expect(paths['/u/{user}/uploadMusicLibrary']?.post?.requestBody?.content['multipart/form-data']).toBeDefined();
    expect(paths['/u/{user}/uploadShout']?.post?.responses['520']).toBeDefined();
    expect(paths['/u/{user}/shouts']?.get?.responses['200']?.content?.['text/event-stream']).toBeDefined();
  });

  test('Scalar is served from here', async () => {
    const docs = await (await handle(new Request(`${base}/api/docs`))).text();
    expect(docs).toContain('/api/scalar.js');
    expect(docs).not.toContain('cdn.jsdelivr.net');

    const script = await handle(new Request(`${base}/api/scalar.js`));
    expect(script.status).toBe(200);
    expect(script.headers.get('content-type')).toStartWith('text/javascript');
  });
});
