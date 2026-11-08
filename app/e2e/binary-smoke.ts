// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The compiled executable (bun run build:binary), started from a folder of its own, called over HTTP as browsers and SoundBuddy call it :
// what it must have taken along, and what it must still do. Usage : bun e2e/binary-smoke.ts [executable]

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const given = resolve(process.argv[2] ?? 'bin/soundvitrine');
const executable = existsSync(given) ? given : `${given}.exe`;
const folder = mkdtempSync(join(tmpdir(), 'soundvitrine-binary-'));
const port = 38000 + Math.floor(Math.random() * 1000);
const base = `http://localhost:${port}`;

// from a folder without sources next to it
const server = Bun.spawn([executable], {
  cwd: folder,
  env: { ...process.env, PORT: String(port), SOUNDVITRINE_STATE_PATH: join(folder, 'state') },
  stdout: 'ignore',
  stderr: 'inherit',
});

let failures = 0;
function check(what: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? ` : ${detail}` : ''}`);
}
const get = (path: string, init?: RequestInit) => fetch(base + path, { redirect: 'manual', ...init });

try {
  let started = false;
  for (let attempt = 0; attempt < 100 && !started; attempt++) {
    started = await get('/healthz')
      .then(response => response.ok)
      .catch(() => false);
    if (!started) await Bun.sleep(100);
  }
  check('starts, and answers /healthz', started);
  if (!started) throw new Error('The executable did not start : what it wrote is above');

  // an account first : its library page loads the build too
  const username = `binary${Date.now() % 100_000}`;
  const password = 'password-of-the-smoke-test';
  const created = await get('/account/create', {
    method: 'POST',
    body: JSON.stringify({ username, password, email: `${username}@example.com` }),
    headers: { 'content-type': 'application/json' },
  });
  check('creates an account (Better Auth, SQLite)', created.status === 200, String(created.status));
  const cookie = created.headers
    .getSetCookie()
    .map(value => value.split(';')[0])
    .join('; ');
  const me = (await (await get('/account/me', { headers: { cookie } })).json()) as { username: string | null };
  check('keeps its session', me.username === username);

  // what it took along : Vite's build, the static files, the flags, Scalar
  const accountPage = await (await get('/account')).text();
  const script = /src="(\/web\/assets\/[^"]+\.js)"/.exec(accountPage)?.[1];
  check('the account page names its script', Boolean(script), script);
  const served = await get(script ?? '/web/none.js');
  check('which is served, kept forever', served.status === 200 && (served.headers.get('cache-control') ?? '').includes('immutable'));
  const flags = [...(await (await get('/')).text()).matchAll(/\/public\/images\/flags\/([a-z-]+\.svg)/g)];
  check('the footer has its flags', flags.length >= 2);
  const logo = new Uint8Array(await (await get('/public/images/logo.png')).arrayBuffer());
  check('a static file, byte for byte', logo.length === readFileSync(join(import.meta.dir, '../client/public/images/logo.png')).length);
  check(
    'the API reference and Scalar',
    (await get('/api/docs')).status === 200 && (await (await get('/api/scalar.js')).arrayBuffer()).byteLength > 100_000,
  );
  check(
    'nothing else',
    (await get('/public/..%2f..%2fpackage.json')).status === 404 && (await get('/web/%2e%2e/%2e%2e/server/app.ts')).status === 404,
  );

  // the API, then OAuth and what it opens
  const document = (await (await get('/api/openapi.json')).json()) as { paths: Record<string, unknown> };
  check('its OpenAPI document', Object.keys(document.paths).length >= 9);
  const tokens = await get('/oauth/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'password', client_id: 'soundbuddy', username, password }),
  });
  const { access_token } = (await tokens.json()) as { access_token?: string };
  check('OAuth password grant', tokens.status === 200 && Boolean(access_token));
  const bearer = { authorization: `Bearer ${access_token}` };

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
  const form = new FormData();
  form.set('file', new File([Bun.deflateSync(new TextEncoder().encode(library))], 'library.zmlib'));
  const uploaded = await get('/api/v1/me/library', { method: 'PUT', body: form, headers: bearer });
  check('a compressed library is uploaded', uploaded.status === 200);
  check('compiled, and served from the state folder', (await get(`/data/users/${username}/unified.json`)).status === 200);
  check('its library page', (await get(`/u/${username}`)).status === 200);

  // live shouts
  const stopReading = new AbortController();
  const stream = await get(`/u/${username}/shouts`, { signal: stopReading.signal });
  const reader = stream.body?.getReader();
  await Bun.sleep(200);
  const shout = { date: new Date().toISOString(), album: 'The Black Album', artist: 'Metallica' };
  await get('/api/v1/me/shouts', {
    method: 'POST',
    body: JSON.stringify(shout),
    headers: { ...bearer, 'content-type': 'application/json' },
  });
  let received = '';
  const until = Date.now() + 5000;
  while (reader && Date.now() < until && !received.includes('Metallica')) {
    const { value, done } = await reader.read();
    if (done) break;
    received += new TextDecoder().decode(value);
  }
  stopReading.abort();
  check('a shout reaches a visitor live', received.includes('Metallica'));

  // released SoundBuddy versions
  const credentials = new FormData();
  credentials.set('username', username);
  credentials.set('password', password);
  const heartbeat = await get('/hb/creds', {
    method: 'POST',
    body: credentials,
    headers: { 'X-Client-Id': 'SoundBuddy', 'X-Client-Version': '0.11.0' },
  });
  check("released SoundBuddy versions' heartbeat", heartbeat.status === 200);
} catch (error) {
  failures++;
  console.log(`FAIL ${(error as Error).message}`);
} finally {
  server.kill();
  await server.exited;
  try {
    rmSync(folder, { recursive: true, force: true });
  } catch {}
}

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
