// The server, called as SoundBuddy calls it

import { beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { handle } from '../app';
import { userFolder } from '../auth/users';
import {
  base,
  credentials,
  expectPlainText,
  library,
  PASSWORD,
  prepareTestUser,
  shout,
  soundBuddyHeaders,
  USER,
  uploadLibrary,
} from './helpers';

beforeAll(prepareTestUser);

describe('heartbeat', () => {
  test('valid credentials', async () => {
    const response = await credentials({ username: USER, password: PASSWORD });
    expect(response.status).toBe(200);
    expectPlainText(response);
    expect(await response.text()).toBe('OK');
  });

  test('the username is trimmed and case insensitive', async () => {
    expect((await credentials({ username: ` ${USER.toUpperCase()} `, password: PASSWORD })).status).toBe(200);
  });

  test('refused credentials : 403 with the reason, which stops SoundBuddy', async () => {
    const response = await credentials({ username: USER, password: 'wrong' });
    expect(response.status).toBe(403);
    expectPlainText(response);
    expect(await response.text()).not.toContain('{');
  });

  test('the reason follows Accept-Language', async () => {
    const french = await credentials({ username: USER, password: 'wrong' }, { ...soundBuddyHeaders, 'Accept-Language': 'fr' });
    const english = await credentials({ username: USER, password: 'wrong' });
    expect(await french.text()).not.toBe(await english.text());
  });

  test('400 when not called by SoundBuddy, or without form', async () => {
    expect((await credentials({ username: USER, password: PASSWORD }, {})).status).toBe(400);
    expect((await credentials({ username: USER, password: PASSWORD }, { 'X-Client-Id': 'Other', 'X-Client-Version': '1' })).status).toBe(
      400,
    );
    expect((await handle(new Request(`${base}/hb/creds`, { method: 'POST', headers: soundBuddyHeaders }))).status).toBe(400);
  });
});

describe('library upload', () => {
  test('errors : 520 in plain text', async () => {
    for (const response of [
      await uploadLibrary(library, 'application/json', { password: 'wrong' }),
      await uploadLibrary('not json'),
      await uploadLibrary('not compressed', 'application/octet-stream'),
    ]) {
      expect(response.status).toBe(520);
      expectPlainText(response);
      expect(await response.text()).not.toBeEmpty();
    }
  });

  test('unknown user', async () => {
    const form = new FormData();
    form.set('headless', '1');
    const response = await handle(new Request(`${base}/u/nobody/uploadMusicLibrary`, { method: 'POST', body: form }));
    expect(response.status).toBe(520);
  });

  test('a compressed library is stored decompressed, and compiled', async () => {
    const response = await uploadLibrary(deflateSync(library), 'application/octet-stream');
    expect(response.status).toBe(200);
    expectPlainText(response);
    expect(await response.text()).toBe('Bon appétit!');

    expect(readFileSync(join(userFolder(USER), 'current.json'), 'utf8')).toBe(library);
    const served = await handle(new Request(`${base}/data/users/${USER}/unified.json`));
    expect(((await served.json()) as { artists: Record<string, unknown> }).artists.Artist).toBeDefined();
  });

  test('the same library again changes nothing', async () => {
    const response = await uploadLibrary(library);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toBe('Bon appétit!');
  });

  test('browser form : back to the library, and its errors are shown in a 200', async () => {
    const form = new FormData();
    form.set('SoundVitrine_file', new File(['[]'], 'library.json', { type: 'application/json' }));
    form.set('password', PASSWORD);
    const response = await handle(new Request(`${base}/u/${USER}`, { method: 'POST', body: form }));
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`/u/${USER}`);

    const refused = new FormData();
    refused.set('SoundVitrine_file', new File(['[]'], 'library.json', { type: 'application/json' }));
    refused.set('password', 'wrong');
    expect((await handle(new Request(`${base}/u/${USER}/uploadMusicLibrary`, { method: 'POST', body: refused }))).status).toBe(200);

    await uploadLibrary(library);
  });
});

describe('shouts', () => {
  const played = { date: '2026-11-04T10:00:00Z', name: 'One', album: 'First', artist: 'Artist', playerState: true, md5: 'abc' };

  test('expects SoundBuddy', async () => {
    const form = new FormData();
    form.set('password', PASSWORD);
    const response = await handle(new Request(`${base}/u/${USER}/uploadShout`, { method: 'POST', body: form }));
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('expects API call');
  });

  test('refused with a wrong password', async () => {
    expect((await shout(JSON.stringify(played), { password: 'wrong' })).status).toBe(520);
  });

  test('stored, and sent live as server-sent events', async () => {
    const abort = new AbortController();
    const stream = await handle(new Request(`${base}/u/${USER}/shouts`, { signal: abort.signal }));
    expect(stream.headers.get('content-type')).toStartWith('text/event-stream');
    const reader = (stream.body as ReadableStream<Uint8Array>).getReader();

    // the stream subscribes as it is first read : its opening comment
    await reader.read();

    const uploading = shout(JSON.stringify(played));
    let received = '';
    while (!received.includes('data:') || !received.endsWith('\n\n')) {
      const { value, done } = await reader.read();
      if (done) break;
      received += new TextDecoder().decode(value);
    }

    expect((await uploading).status).toBe(200);
    expect(received).toContain('event: message');
    expect(JSON.parse(received.split('data: ')[1]?.split('\n')[0] ?? '')).toEqual(played);

    abort.abort();
    await reader.cancel();

    const latest = await handle(new Request(`${base}/data/users/${USER}/shout.json`));
    expect(await latest.json()).toEqual(played);
  });
});
