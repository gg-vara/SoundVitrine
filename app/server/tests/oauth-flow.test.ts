// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// An application logging in through the browser (OAuth's authorization code, with PKCE), as SoundBuddy does : its pages, then its tokens

import { beforeAll, describe, expect, test } from 'bun:test';
import { createHash, randomBytes } from 'node:crypto';
import { handle } from '../app';
import { auth, SOUNDBUDDY_CLIENT_ID } from '../auth/auth';
import { base, prepareTestUser } from './helpers';

const PASSWORD = 'password1';
// a native application's loopback address : any port
const REDIRECT_URI = 'http://127.0.0.1:43210/callback';
const SCOPE = 'library:write shout:write offline_access';

// what a browser sends with a form
const formPost = (path: string, fields: Record<string, string>, cookie = '') =>
  handle(
    new Request(`${base}${path}`, {
      method: 'POST',
      body: new URLSearchParams(fields),
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base, cookie, 'accept-language': 'en' },
    }),
  );

const cookieOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map(cookie => cookie.split(';')[0])
    .join('; ');

// what SoundBuddy starts with : its PKCE verifier, and the address it opens in the browser
function authorization(redirectUri = REDIRECT_URI) {
  const verifier = randomBytes(32).toString('base64url');
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: SOUNDBUDDY_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state: 'some-state',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  });
  return { verifier, url: `${base}/api/auth/oauth2/authorize?${query}` };
}

const tokenRequest = (fields: Record<string, string>) =>
  handle(
    new Request(`${base}/api/auth/oauth2/token`, {
      method: 'POST',
      body: new URLSearchParams({ client_id: SOUNDBUDDY_CLIENT_ID, ...fields }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  );

// a user of their own : the consent given is remembered, and the next authorization would skip its page
let users = 0;
async function newUser(): Promise<string> {
  users += 1;
  const username = `oauthflow${users}`;
  await auth.api.signUpEmail({ body: { name: username, username, password: PASSWORD, email: `${username}@example.com` } });
  return username;
}

// from the start in the browser to the code SoundBuddy receives : "accept" the user's answer
async function browserFlow(accept = true, username?: string) {
  const user = username ?? (await newUser());
  const { verifier, url } = authorization();

  const authorize = await handle(new Request(url));
  const loginUrl = new URL(authorize.headers.get('location') ?? '', base);
  const oauthQuery = loginUrl.search.slice(1);

  const login = await formPost('/oauth/login', { username: user, password: PASSWORD, oauth_query: oauthQuery });
  const cookie = cookieOf(login);
  const consentUrl = new URL(login.headers.get('location') ?? '', base);

  const consent = await formPost('/oauth/consent', { accept: String(accept), oauth_query: consentUrl.search.slice(1) }, cookie);
  return {
    user,
    verifier,
    authorize,
    loginUrl,
    login,
    cookie,
    consentUrl,
    consent,
    back: new URL(consent.headers.get('location') ?? 'about:blank'),
  };
}

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

  test('logging out in the browser does not disconnect the application : it keeps refreshing its tokens', async () => {
    const { back, verifier, cookie } = await browserFlow();
    const code = back.searchParams.get('code') ?? '';
    const response = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier });
    const { refresh_token } = (await response.json()) as { refresh_token: string };

    await handle(new Request(`${base}/account/disconnect`, { method: 'POST', headers: { cookie, origin: base } }));
    expect((await tokenRequest({ grant_type: 'refresh_token', refresh_token })).status).toBe(200);
  });
});
