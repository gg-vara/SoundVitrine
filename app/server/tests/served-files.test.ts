// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Vite's build, and the API's reference

import { beforeAll, describe, expect, test } from 'bun:test';
import { handle } from '../app';
import { clientEntries, embedded } from '../embedded';
import { ACCOUNT_ENTRY, LIBRARY_ENTRY } from '../pages/layout';
import { base, prepareTestUser } from './helpers';

beforeAll(prepareTestUser);

describe("Vite's build", () => {
  const library = clientEntries[LIBRARY_ENTRY];

  test('the pages know the files of its entries', () => {
    for (const name of [LIBRARY_ENTRY, ACCOUNT_ENTRY]) {
      const entry = clientEntries[name];
      expect(entry && embedded[`web/${entry.file}`]).toBeTruthy();
      for (const css of entry?.css ?? []) expect(embedded[`web/${css}`]).toBeTruthy();
    }
  });

  test('is served at /web/, kept forever', async () => {
    const response = await handle(new Request(`${base}/web/${library?.file}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toStartWith('text/javascript');
    expect(response.headers.get('cache-control')).toContain('immutable');
    expect(await response.text()).toBe(await Bun.file(embedded[`web/${library?.file}`] as string).text());
  });

  test('serves nothing else', async () => {
    for (const path of [
      '/web/assets/missing.js',
      '/web/..%2fmain.ts',
      '/web/%2e%2e/%2e%2e/package.json',
      '/web/%E0%A4%A',
      '/public/..%2f..%2fpackage.json',
    ]) {
      expect((await handle(new Request(`${base}${path}`))).status).toBe(404);
    }
    expect((await handle(new Request(`${base}/web/${library?.file}`, { method: 'POST' }))).status).not.toBe(200);
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
