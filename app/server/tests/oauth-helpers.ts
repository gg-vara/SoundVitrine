// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// An application logging in through the browser, as SoundBuddy does : what the tests of OAuth and of the API share

import { createHash, randomBytes } from 'node:crypto';
import { handle } from '../app';
import { API_RESOURCE, auth, SOUNDBUDDY_CLIENT_ID } from '../auth/auth';
import { base } from './helpers';

export const PASSWORD = 'password1';
// a native application's loopback address : any port
export const REDIRECT_URI = 'http://127.0.0.1:43210/callback';
export const SCOPE = 'library:write shout:write offline_access';

// what a browser sends with a form
export const formPost = (path: string, fields: Record<string, string>, cookie = '') =>
  handle(
    new Request(`${base}${path}`, {
      method: 'POST',
      body: new URLSearchParams(fields),
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base, cookie, 'accept-language': 'en' },
    }),
  );

export const cookieOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map(cookie => cookie.split(';')[0])
    .join('; ');

// what SoundBuddy starts with : its PKCE verifier, and the address it opens in the browser
export function authorization(redirectUri = REDIRECT_URI, scope = SCOPE) {
  const verifier = randomBytes(32).toString('base64url');
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: SOUNDBUDDY_CLIENT_ID,
    redirect_uri: redirectUri,
    scope,
    state: 'some-state',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    // tokens for the API (RFC 8707)
    resource: API_RESOURCE,
  });
  return { verifier, url: `${base}/api/auth/oauth2/authorize?${query}` };
}

export const tokenRequest = (fields: Record<string, string>) =>
  handle(
    new Request(`${base}/api/auth/oauth2/token`, {
      method: 'POST',
      body: new URLSearchParams({ client_id: SOUNDBUDDY_CLIENT_ID, resource: API_RESOURCE, ...fields }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  );

// a user of their own : the consent given is remembered, and the next authorization would skip its page
let users = 0;
export async function newUser(): Promise<string> {
  users += 1;
  const username = `oauthflow${users}`;
  await auth.api.signUpEmail({ body: { name: username, username, password: PASSWORD, email: `${username}@example.com` } });
  return username;
}

// from the start in the browser to the code SoundBuddy receives : "accept" the user's answer
export async function browserFlow(accept = true, username?: string, scope = SCOPE) {
  const user = username ?? (await newUser());
  const { verifier, url } = authorization(REDIRECT_URI, scope);

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

// tokens of a new user, through the whole flow
export async function tokensFor(scope = SCOPE) {
  const { user, back, verifier } = await browserFlow(true, undefined, scope);
  const code = back.searchParams.get('code') ?? '';
  const response = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier });
  return { user, ...((await response.json()) as { access_token: string; refresh_token: string; scope: string }) };
}
