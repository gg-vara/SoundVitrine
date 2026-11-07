// The server, called as SoundBuddy and browsers call it

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { handle, prepareState } from '../app';
import { auth } from '../auth';
import { compressedResponse } from '../compressed-response';
import { APP_ROOT, STATE_FOLDER_PATH } from '../config';
import { database } from '../db';
import { clientEntryIn } from '../pages/layout';
import { userFolder } from '../users';

const USER = 'curator';
const PASSWORD = 'password1';
const base = 'http://localhost';
const library = JSON.stringify([
  {
    Name: 'One',
    Album: 'First',
    'Album Artist': 'Artist',
    Genre: 'Rock',
    Year: 1997,
    'Disc Number': 1,
    'Track Number': 1,
    'Date Added': '2020-01-01T00:00:00Z',
  },
]);

const soundBuddyHeaders = { 'X-Client-Id': 'SoundBuddy', 'X-Client-Version': '0.11.0', 'Accept-Language': 'en' };

function credentials(fields: Record<string, string>, headers: Record<string, string> = soundBuddyHeaders) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return handle(new Request(`${base}/hb/creds`, { method: 'POST', body: form, headers }));
}

// the very bytes SoundBuddy sends (src/net/Multipart.h, src/helpers/UploadHelper.h)
function upload(action: string, field: string, content: string | Uint8Array, type: string, extra: Record<string, string> = {}) {
  const boundary = '----SoundBuddyBoundaryabcdefghijklmnopqrstuvwx';
  const extension = type === 'application/json' ? '.json' : '.zmlib';
  const fields = Object.entries({ password: PASSWORD, headless: '1', ...extra })
    .map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
    .join('');
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${field}${extension}"\r\nContent-Type: ${type}\r\n\r\n`,
    ),
    Buffer.from(content),
    Buffer.from(`\r\n${fields}--${boundary}--\r\n`),
  ]);
  const headers = { 'Accept-Language': 'en', 'Content-Type': `multipart/form-data; boundary=${boundary}` };
  return handle(new Request(`${base}/u/${USER}/${action}`, { method: 'POST', body, headers }));
}

const uploadLibrary = (content: string | Uint8Array, type = 'application/json', extra?: Record<string, string>) =>
  upload('uploadMusicLibrary', 'SoundVitrine_file', content, type, extra);

const shout = (content: string, extra?: Record<string, string>) => upload('uploadShout', 'shout_file', content, 'application/json', extra);

const expectPlainText = (response: Response) => expect(response.headers.get('content-type')).toStartWith('text/plain');

const createUser = async (username: string, password = PASSWORD) => {
  await auth.api.signUpEmail({ body: { name: username, username, password, email: `${username}@example.com` } });
  await prepareState();
};

beforeAll(async () => {
  await prepareState();
  await createUser(USER);
});

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

describe('pages', () => {
  const browserPost = (path: string, fields: Record<string, string>) =>
    handle(
      new Request(`${base}${path}`, {
        method: 'POST',
        body: new URLSearchParams(fields),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

  const cookieOf = (response: Response) => response.headers.get('set-cookie')?.split(';')[0] ?? '';

  test('welcome lists the users, never their private data', async () => {
    const page = await (await handle(new Request(`${base}/`))).text();
    expect(page).toContain(`/u/${USER}`);
    expect(page).not.toContain(PASSWORD);
    expect(page).not.toContain(`${USER}@example.com`);
  });

  test('the API documentation is one click away : from the welcome page, and the footer of any page', async () => {
    const links = (page: string) => page.split('href="/api/docs"').length - 1;
    expect(links(await (await handle(new Request(`${base}/`))).text())).toBe(2);
    expect(links(await (await handle(new Request(`${base}/account`))).text())).toBe(1);
    expect(links(await (await handle(new Request(`${base}/u/${USER}`))).text())).toBe(1);
  });

  test('the library page', async () => {
    const response = await handle(new Request(`${base}/u/${USER.toUpperCase()}`));
    const page = await response.text();
    expect(response.headers.get('content-type')).toStartWith('text/html');
    expect(page).toContain('id="library"');
    expect(page).toContain(`"shoutStreamUrl":"/u/${USER}/shouts"`);
  });

  test('a user without library gets the upload form', async () => {
    await createUser('emptyuser');
    expect(await (await handle(new Request(`${base}/u/emptyuser`))).text()).toContain('name="SoundVitrine_file"');
  });

  const accountPost = (path: string, fields: Record<string, string> = {}, headers: Record<string, string> = {}, client?: string) =>
    handle(
      new Request(`${base}${path}`, {
        method: 'POST',
        body: JSON.stringify(fields),
        headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en', ...headers },
      }),
      client,
    );

  const meOf = async (cookie: string) =>
    (await (await handle(new Request(`${base}/account/me`, { headers: { cookie } }))).json()) as { username: string | null };

  test('login, then who is logged', async () => {
    const refused = await accountPost('/account/login', { username: USER, password: 'wrong' });
    expect(refused.status).toBe(401);
    // nothing is being uploaded here, unlike where the same check serves SoundBuddy
    expect(await refused.json()).toEqual({ error: 'Wrong password.' });

    const logged = await accountPost('/account/login', { username: USER, password: PASSWORD });
    expect(logged.status).toBe(200);
    expect((await meOf(cookieOf(logged))).username).toBe(USER);
  });

  test('nobody is logged without a session, or with a tampered one', async () => {
    const logged = await accountPost('/account/login', { username: USER, password: PASSWORD });
    const [payload] = cookieOf(logged).split('.');
    expect((await meOf('')).username).toBeNull();
    expect((await meOf(`${payload}.forged`)).username).toBeNull();
  });

  test('the account page is what the browser renders', async () => {
    for (const path of ['/account', '/account/create']) {
      const page = await (await handle(new Request(`${base}${path}`))).text();
      expect(page).toContain('<div id="account"');
      expect(page).toContain('const i18n =');
    }
  });

  test('passwords are stored hashed', () => {
    const { password } = database.query<{ password: string }, []>('SELECT password FROM account LIMIT 1').get() as { password: string };
    expect(password).not.toBe(PASSWORD);
    expect(password.length).toBeGreaterThan(50);
  });

  test('logging out ends the session in the database, not only in the browser', async () => {
    const logged = await accountPost('/account/login', { username: USER, password: PASSWORD });
    const cookie = cookieOf(logged);
    await accountPost('/account/disconnect', {}, { cookie });
    expect((await meOf(cookie)).username).toBeNull();
  });

  test('too many failures block that client on that account, even with the right password', async () => {
    await createUser('guessed1');
    const post = (password: string, client: string) => accountPost('/account/login', { username: 'guessed1', password }, {}, client);

    for (let i = 0; i < 10; i++) expect((await post('wrong', '10.0.0.1')).status).toBe(401);
    expect((await post(PASSWORD, '10.0.0.1')).status).toBe(429);

    expect((await post(PASSWORD, '10.0.0.2')).status).toBe(200);
  });

  test('SoundBuddy gets a 429 when blocked, which does not make it give up', async () => {
    await createUser('guessed2');
    const check = (password: string) => {
      const body = new FormData();
      body.set('username', 'guessed2');
      body.set('password', password);
      return handle(new Request(`${base}/hb/creds`, { method: 'POST', body, headers: soundBuddyHeaders }), '10.0.0.3');
    };

    for (let i = 0; i < 10; i++) expect((await check('wrong')).status).toBe(403);
    expect((await check(PASSWORD)).status).toBe(429);
  });

  test('an email cannot serve two accounts', async () => {
    const taken = await accountPost('/account/create', { username: 'secondcurator', password: PASSWORD, email: `${USER}@example.com` });
    expect(taken.status).toBe(400);
  });

  test('account creation', async () => {
    const tooShort = await accountPost('/account/create', { username: 'abc', password: PASSWORD, email: 'a@example.com' });
    expect(tooShort.status).toBe(400);

    const created = await accountPost('/account/create', { username: 'NewCurator', password: PASSWORD, email: 'a@example.com' });
    expect(created.status).toBe(200);
    expect((await meOf(cookieOf(created))).username).toBe('newcurator');

    const again = await accountPost('/account/create', { username: 'newcurator', password: PASSWORD, email: 'a@example.com' });
    expect(again.status).toBe(400);
  });

  test('the band colors only take colors', async () => {
    const logged = await accountPost('/account/login', { username: USER, password: PASSWORD });
    const post = (body: unknown) =>
      handle(new Request(`${base}/account/colors`, { method: 'POST', body: JSON.stringify(body), headers: { cookie: cookieOf(logged) } }));

    expect(await (await post(['#000000', '#111111', '#222222', '#333333'])).text()).toBe('OK');
    expect(await (await post(['</style><script>', '#111111', '#222222', '#333333'])).text()).toBe('');
  });

  test('the language chosen in the footer sticks', async () => {
    const chosen = await browserPost('/account', { set_lang: 'fr' });
    expect(chosen.status).toBe(303);
    const page = await handle(new Request(`${base}/account`, { headers: { cookie: cookieOf(chosen), 'Accept-Language': 'en' } }));
    expect(await page.text()).toContain('<html lang="fr">');
  });

  test('state files stay out of reach', async () => {
    for (const path of [
      '/data/users/..%2fsoundvitrine.db',
      '/data/users/%2e%2e/session.key',
      '/public/..%2fmain.ts',
      '/public/..%2f..%2fserver/app.ts',
    ]) {
      const response = await handle(new Request(`${base}${path}`));
      expect(await response.text()).not.toContain(PASSWORD);
      expect(response.status).toBe(404);
    }
    expect(existsSync(join(STATE_FOLDER_PATH, 'soundvitrine.db'))).toBe(true);
  });

  test('health check, and unknown pages', async () => {
    expect(await (await handle(new Request(`${base}/healthz`))).text()).toBe('OK');
    expect((await handle(new Request(`${base}/nothing`))).status).toBe(404);
  });
});
