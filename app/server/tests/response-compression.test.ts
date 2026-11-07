// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the server compresses, and for whom

import { beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { handle } from '../app';
import { userFolder } from '../auth/users';
import { compressedResponse } from '../compressed-response';
import { APP_ROOT } from '../config';
import { base, createUser, PASSWORD, prepareTestLibrary, soundBuddyHeaders, USER } from './helpers';

beforeAll(prepareTestLibrary);

describe('compression', () => {
  const asBrowser = (path: string, init: RequestInit = {}) =>
    handle(new Request(`${base}${path}`, { ...init, headers: { 'accept-encoding': 'gzip, deflate, br', ...init.headers } }));
  const gunzipped = async (response: Response) => Bun.gunzipSync(new Uint8Array(await response.arrayBuffer()));

  test('a page, for who asks', async () => {
    const response = await asBrowser('/');
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.get('content-type')).toStartWith('text/html');
    expect(response.headers.get('vary')).toContain('Accept-Encoding');
    expect(new TextDecoder().decode(await gunzipped(response))).toContain('<!DOCTYPE html>');
  });

  test('not for who does not', async () => {
    const response = await handle(new Request(`${base}/`));
    expect(response.headers.has('content-encoding')).toBe(false);
    expect(response.headers.get('vary')).toContain('Accept-Encoding');
    expect(await response.text()).toContain('<!DOCTYPE html>');
  });

  test('nor for who refuses it', async () => {
    const response = await handle(new Request(`${base}/`, { headers: { 'accept-encoding': 'gzip;q=0, br' } }));
    expect(response.headers.has('content-encoding')).toBe(false);
  });

  test('a file keeps its content, and tells its size for the loading bar', async () => {
    const original = await Bun.file(join(APP_ROOT, 'client/public/images/chrome.svg')).bytes();
    const response = await asBrowser('/public/images/chrome.svg');
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.has('content-length')).toBe(false);
    expect(response.headers.get('x-original-content-length')).toBe(String(original.length));
    expect(response.headers.get('cache-control')).toContain('max-age');
    expect(await gunzipped(response)).toEqual(original);
  });

  test('a compiled library', async () => {
    await createUser('gzippeduser');
    const library = JSON.stringify({ artists: Object.fromEntries(Array.from({ length: 500 }, (_, index) => [`Artist ${index}`, {}])) });
    mkdirSync(userFolder('gzippeduser'), { recursive: true });
    writeFileSync(join(userFolder('gzippeduser'), 'unified.json'), library);

    const response = await asBrowser('/data/users/gzippeduser/unified.json');
    expect(response.status).toBe(200);
    expect(response.headers.get('x-original-content-length')).toBe(String(library.length));
    expect(new TextDecoder().decode(await gunzipped(response))).toBe(library);
  });

  test('a small library as it is', async () => {
    const response = await asBrowser(`/data/users/${USER}/unified.json`);
    expect(response.status).toBe(200);
    expect(response.headers.has('content-encoding')).toBe(false);
  });

  test('nothing to compress in a HEAD', async () => {
    const response = await asBrowser('/', { method: 'HEAD' });
    expect(response.headers.has('content-encoding')).toBe(false);
  });

  test('not what is compressed already', async () => {
    for (const path of ['/public/images/logo.png', '/public/videos/bg.mp4', '/public/fonts/BebasNeue-Regular.otf']) {
      const response = await asBrowser(path);
      expect(response.status).toBe(200);
      expect(response.headers.has('content-encoding')).toBe(false);
    }
  });

  test('not a small file', async () => {
    const response = await handle(new Request(`${base}/public/favicon/site.webmanifest`, { headers: { 'accept-encoding': 'gzip' } }));
    expect(response.status).toBe(200);
    if (Number(response.headers.get('content-length')) < 1024) expect(response.headers.has('content-encoding')).toBe(false);
  });

  test('not a part of a file', async () => {
    const response = await asBrowser('/public/images/chrome.svg', { headers: { range: 'bytes=0-99', 'accept-encoding': 'gzip' } });
    expect(response.headers.has('content-encoding')).toBe(false);
  });

  test('not what SoundBuddy reads', async () => {
    const response = await handle(
      new Request(`${base}/hb/creds`, {
        method: 'POST',
        body: (() => {
          const form = new FormData();
          form.set('username', USER);
          form.set('password', PASSWORD);
          return form;
        })(),
        headers: { ...soundBuddyHeaders, 'accept-encoding': 'gzip' },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.has('content-encoding')).toBe(false);
    expect(await response.text()).toBe('OK');
  });

  test('not live shouts', async () => {
    const stream = await asBrowser(`/u/${USER}/shouts`);
    expect(stream.headers.get('content-type')).toStartWith('text/event-stream');
    expect(stream.headers.has('content-encoding')).toBe(false);
    await stream.body?.cancel();
  });

  test('not a page that fails', async () => {
    const response = await asBrowser('/public/missing.js');
    expect(response.status).toBe(404);
    expect(response.headers.has('content-encoding')).toBe(false);
  });

  test('cookies stay', async () => {
    const headers = new Headers({ 'content-type': 'text/html' });
    headers.append('set-cookie', 'a=1');
    headers.append('set-cookie', 'b=2');
    const response = compressedResponse(
      new Request(`${base}/`, { headers: { 'accept-encoding': 'gzip' } }),
      new Response('<!DOCTYPE html>'.repeat(200), { headers }),
    );
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.getSetCookie()).toEqual(['a=1', 'b=2']);
  });
});
