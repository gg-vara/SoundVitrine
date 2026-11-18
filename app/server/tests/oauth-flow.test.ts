// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// An application logging in through the browser (OAuth's authorization code, with PKCE), as SoundBuddy does : its pages, then its tokens

import { beforeAll, describe, expect, test } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { handle } from '../app';
import { SOUNDBUDDY_CLIENT_ID } from '../auth/auth';
import { base, prepareTestUser } from './helpers';
import { authorization, browserFlow, formPost, newUser, PASSWORD, REDIRECT_URI, SCOPE, tokenRequest } from './oauth-helpers';

beforeAll(prepareTestUser);

describe('logging in through the browser', () => {
  test('not logged in : the login page, telling the application', async () => {
    const { authorize, loginUrl } = await browserFlow();
    expect(authorize.status).toBe(302);
    expect(loginUrl.pathname).toBe('/oauth/login');

    const page = await (await handle(new Request(loginUrl))).text();
    expect(page).toContain('SoundBuddy');
    expect(page).toContain('name="oauth_query"');
  });

  test('then the consent page, telling what is asked', async () => {
    const { user, login, consentUrl, cookie } = await browserFlow();
    expect(login.status).toBe(303);
    expect(consentUrl.pathname).toBe('/oauth/consent');

    const page = await (await handle(new Request(consentUrl, { headers: { cookie, 'accept-language': 'en' } }))).text();
    expect(page).toContain('replace your library');
    expect(page).toContain('tell what you are listening to');
    expect(page).toContain(user);
  });

  test('allowed : back to the application with a code, exchanged with its PKCE verifier for tokens', async () => {
    const { consent, back, verifier } = await browserFlow();
    expect(consent.status).toBe(303);
    expect(`${back.origin}${back.pathname}`).toBe(REDIRECT_URI);
    expect(back.searchParams.get('state')).toBe('some-state');

    const code = back.searchParams.get('code') ?? '';
    const response = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier });
    expect(response.status).toBe(200);
    const tokens = (await response.json()) as { access_token: string; refresh_token: string; scope: string; token_type: string };
    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.scope.split(' ').sort()).toEqual(SCOPE.split(' ').sort());
    expect(tokens.refresh_token).toBeTruthy();
  });

  test('a code only works with its verifier, and only once', async () => {
    const { back, verifier } = await browserFlow();
    const code = back.searchParams.get('code') ?? '';
    const exchange = (codeVerifier: string) =>
      tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: codeVerifier });

    expect((await exchange(randomBytes(32).toString('base64url'))).status).toBe(400);
    expect((await exchange(verifier)).status).toBe(200);
    expect((await exchange(verifier)).status).toBe(400);
  });

  test('the consent is remembered : the next authorization goes straight back to the application', async () => {
    const { user } = await browserFlow();
    const { login } = await browserFlow(true, user);
    const back = new URL(login.headers.get('location') ?? '', base);
    expect(`${back.origin}${back.pathname}`).toBe(REDIRECT_URI);
    expect(back.searchParams.has('code')).toBe(true);
  });

  test('denied : back to the application without a code', async () => {
    const { back } = await browserFlow(false);
    expect(back.searchParams.get('error')).toBe('access_denied');
    expect(back.searchParams.has('code')).toBe(false);
  });

  test('never to an address the application did not register', async () => {
    const response = await handle(new Request(authorization('http://evil.example/callback').url));
    expect(response.headers.get('location') ?? '').not.toContain('evil.example');
  });

  test('a wrong password says so, on the same page', async () => {
    const { user, loginUrl } = await browserFlow();
    const response = await formPost('/oauth/login', { username: user, password: 'wrong-password', oauth_query: loginUrl.search.slice(1) });
    expect(response.status).toBe(401);
    expect(await response.text()).toContain('Wrong password');
  });

  test('a query Better Auth did not sign is refused', async () => {
    const forged = new URLSearchParams({ client_id: SOUNDBUDDY_CLIENT_ID, redirect_uri: 'http://127.0.0.1:1/callback', sig: 'forged' });
    const response = await formPost('/oauth/login', { username: await newUser(), password: PASSWORD, oauth_query: forged.toString() });
    expect(response.status).toBe(400);
    expect(response.headers.has('location')).toBe(false);
  });

  test('logging out in the browser does not disconnect the application : its new tokens still open the API', async () => {
    const { user, back, verifier, cookie } = await browserFlow();
    const code = back.searchParams.get('code') ?? '';
    const response = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier });
    const { refresh_token } = (await response.json()) as { refresh_token: string };

    await handle(new Request(`${base}/account/disconnect`, { method: 'POST', headers: { cookie, origin: base } }));

    // refreshed twice, as days go by, and used : not only refreshed
    let token = refresh_token;
    for (let round = 0; round < 2; round++) {
      const refreshed = await tokenRequest({ grant_type: 'refresh_token', refresh_token: token });
      expect(refreshed.status).toBe(200);
      const next = (await refreshed.json()) as { access_token: string; refresh_token: string };
      const me = await handle(new Request(`${base}/api/v1/me`, { headers: { Authorization: `Bearer ${next.access_token}` } }));
      expect(me.status).toBe(200);
      expect(((await me.json()) as { username: string }).username).toBe(user);
      token = next.refresh_token;
    }
  });
});
