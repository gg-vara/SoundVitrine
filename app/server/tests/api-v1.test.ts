// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What OAuth opens (/api/v1), with the tokens an application gets through the browser

import { beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { handle } from '../app';
import { auth } from '../auth/auth';
import { ensureUserFolders, userFolder } from '../auth/users';
import { latestShout } from '../db';
import { base, prepareTestUser } from './helpers';
import { tokenRequest, tokensFor } from './oauth-helpers';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const me = (token: string) => handle(new Request(`${base}/api/v1/me`, { headers: bearer(token) }));

function putLibrary(token: string, content: string | Uint8Array) {
  const body = new FormData();
  body.set('file', new File([typeof content === 'string' ? content : new Uint8Array(content)], 'library.json'));
  return handle(new Request(`${base}/api/v1/me/library`, { method: 'PUT', body, headers: bearer(token) }));
}

const postShout = (token: string, shout: unknown) =>
  handle(
    new Request(`${base}/api/v1/me/shouts`, {
      method: 'POST',
      body: JSON.stringify(shout),
      headers: { ...bearer(token), 'Content-Type': 'application/json' },
    }),
  );

beforeAll(prepareTestUser);

describe('/api/v1', () => {
  test('tells who the token is for, and what it allows', async () => {
    const { user, access_token } = await tokensFor();
    const answer = (await (await me(access_token)).json()) as { username: string; scopes: string[] };
    expect(answer.username).toBe(user);
    expect(answer.scopes).toEqual(expect.arrayContaining(['library:write', 'shout:write']));
  });

  test('refuses without a token, or with an unknown one, as RFC 9457 and RFC 6750 tell', async () => {
    for (const response of [await handle(new Request(`${base}/api/v1/me`)), await me('not-a-token')]) {
      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toBe('Bearer');
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      expect(((await response.json()) as { status: number }).status).toBe(401);
    }
  });

  test('replaces the library, telling when nothing changed', async () => {
    const { user, access_token } = await tokensFor();
    const library = JSON.stringify([{ Name: 'One', Album: 'First', 'Album Artist': 'Artist', Genre: 'Rock', Year: 1997 }]);

    expect(await (await putLibrary(access_token, library)).json()).toEqual({ changed: true });
    expect(await (await putLibrary(access_token, library)).json()).toEqual({ changed: false });
    expect((await handle(new Request(`${base}/u/${user}`))).headers.get('content-type')).toStartWith('text/html');
  });

  test('a compressed library is stored decompressed, and compiled', async () => {
    const { user, access_token } = await tokensFor();
    const library = JSON.stringify([{ Name: 'Two', Album: 'Second', 'Album Artist': 'Packed', Genre: 'Jazz', Year: 1959 }]);

    expect((await putLibrary(access_token, deflateSync(library))).status).toBe(200);
    expect(readFileSync(join(userFolder(user), 'current.json'), 'utf8')).toBe(library);
    const served = await handle(new Request(`${base}/data/users/${user}/unified.json`));
    expect(((await served.json()) as { artists: Record<string, unknown> }).artists.Packed).toBeDefined();
  });

  test('refuses what is no library', async () => {
    const { access_token } = await tokensFor();
    const response = await putLibrary(access_token, 'not json');
    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
  });

  test('shouts, keeping what is not one', async () => {
    const { user, access_token } = await tokensFor();
    const shout = { date: new Date().toISOString(), artist: 'Artist', album: 'Album', name: 'Track' };
    expect(await (await postShout(access_token, shout)).json()).toEqual({ sent: true });
    expect(JSON.parse(latestShout(user) ?? '{}').name).toBe('Track');
  });

  test('a shout reaches the visitors of the library page live, as server-sent events', async () => {
    const { user, access_token } = await tokensFor();
    // its library page exists : the folders of the users are made as the server starts
    ensureUserFolders();
    const played = { date: '2026-11-04T10:00:00Z', name: 'One', album: 'First', artist: 'Artist', playerState: true, md5: 'abc' };
    const abort = new AbortController();
    const stream = await handle(new Request(`${base}/u/${user}/shouts`, { signal: abort.signal }));
    expect(stream.headers.get('content-type')).toStartWith('text/event-stream');
    const reader = (stream.body as ReadableStream<Uint8Array>).getReader();

    // the stream subscribes as it is first read : its opening comment
    await reader.read();

    const posting = postShout(access_token, played);
    let received = '';
    while (!received.includes('data:') || !received.endsWith('\n\n')) {
      const { value, done } = await reader.read();
      if (done) break;
      received += new TextDecoder().decode(value);
    }

    expect((await posting).status).toBe(200);
    expect(received).toContain('event: message');
    expect(JSON.parse(received.split('data: ')[1]?.split('\n')[0] ?? '')).toEqual(played);
    abort.abort();
    await reader.cancel();

    expect(await (await handle(new Request(`${base}/data/users/${user}/shout.json`))).json()).toEqual(played);
  });

  test('keeps to the scopes the user granted', async () => {
    const { access_token } = await tokensFor('shout:write');
    expect((await putLibrary(access_token, '[]')).status).toBe(403);
    expect((await postShout(access_token, { artist: 'Artist' })).status).toBe(200);
  });

  test('a token signed for something else is refused', async () => {
    const { access_token } = await tokensFor();
    const [header, payload, signature] = access_token.split('.');
    const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString());
    claims.aud = 'http://elsewhere.example/api';
    const tampered = [header, Buffer.from(JSON.stringify(claims)).toString('base64url'), signature].join('.');
    expect((await me(tampered)).status).toBe(401);
  });

  test('a revoked login gets no new token', async () => {
    const { refresh_token } = await tokensFor();
    await auth.api.oauth2Revoke({ body: { token: refresh_token, token_type_hint: 'refresh_token', client_id: 'soundbuddy' } });
    expect((await tokenRequest({ grant_type: 'refresh_token', refresh_token })).status).toBe(400);
  });

  test('is documented, with how to get a token through the browser', async () => {
    const document = (await (await handle(new Request(`${base}/api/openapi.json`))).json()) as {
      paths: Record<string, unknown>;
      components: {
        securitySchemes: {
          oauth: {
            flows: {
              authorizationCode: {
                authorizationUrl: string;
                tokenUrl: string;
                scopes: Record<string, string>;
                'x-scalar-security-query': { resource: string };
              };
            };
          };
        };
      };
    };
    expect(Object.keys(document.paths)).toEqual(expect.arrayContaining(['/api/v1/me', '/api/v1/me/library', '/api/v1/me/shouts']));
    expect(Object.keys(document.paths)).not.toContain('/oauth/token');
    const flow = document.components.securitySchemes.oauth.flows.authorizationCode;
    expect(flow.authorizationUrl).toBe('/api/auth/oauth2/authorize');
    expect(flow.tokenUrl).toBe('/api/auth/oauth2/token');
    expect(Object.keys(flow.scopes)).toContain('shout:write');
    expect(flow['x-scalar-security-query'].resource).toBe(`${base}/api/v1`);
  });
});
