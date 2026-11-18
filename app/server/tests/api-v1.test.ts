// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What OAuth opens (/api/v1), with the tokens an application gets through the browser

import { beforeAll, describe, expect, test } from 'bun:test';
import { handle } from '../app';
import { auth } from '../auth/auth';
import { latestShout } from '../db';
import { base, prepareTestUser } from './helpers';
import { tokenRequest, tokensFor } from './oauth-helpers';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const me = (token: string) => handle(new Request(`${base}/api/v1/me`, { headers: bearer(token) }));

function putLibrary(token: string, content: string) {
  const body = new FormData();
  body.set('file', new File([content], 'library.json'));
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
