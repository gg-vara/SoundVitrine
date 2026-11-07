import { beforeAll, describe, expect, test } from 'bun:test';
import { handle, prepareState } from '../app';
import { auth } from '../auth/auth';
import { ACCESS_TOKEN_SECONDS, authenticate, issueTokens, parseScope, refreshTokens } from '../auth/tokens';
import { database, latestShout } from '../db';

const USER = 'oauthcurator';
const PASSWORD = 'password1';
const base = 'http://localhost';
const CLIENT = 'soundbuddy';

const form = (path: string, fields: Record<string, string>, client = '10.1.0.1') =>
  handle(
    new Request(`${base}${path}`, {
      method: 'POST',
      body: new URLSearchParams(fields),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept-Language': 'en' },
    }),
    client,
  );

const passwordGrant = (fields: Record<string, string> = {}) =>
  form('/oauth/token', { grant_type: 'password', client_id: CLIENT, username: USER, password: PASSWORD, ...fields });

interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

const login = async (fields?: Record<string, string>) => (await (await passwordGrant(fields)).json()) as Tokens;

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

beforeAll(async () => {
  await prepareState();
  await auth.api.signUpEmail({ body: { name: USER, username: USER, password: PASSWORD, email: `${USER}@example.com` } });
  await prepareState();
});

describe('the password grant', () => {
  test('gives tokens, which caches must not keep', async () => {
    const response = await passwordGrant();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');

    const tokens = (await response.json()) as Tokens;
    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.expires_in).toBe(ACCESS_TOKEN_SECONDS);
    expect(tokens.scope).toBe('library:write shout:write');
    expect(tokens.access_token).not.toBe(tokens.refresh_token);
  });

  test('refuses a wrong password, in the shape of RFC 6749', async () => {
    const response = await passwordGrant({ password: 'wrong' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_grant', error_description: 'Wrong password.' });
  });

  test('refuses an unknown client, grant or scope', async () => {
    expect((await passwordGrant({ client_id: 'stranger' })).status).toBe(401);
    expect(((await (await passwordGrant({ grant_type: 'client_credentials' })).json()) as { error: string }).error).toBe(
      'unsupported_grant_type',
    );
    expect(((await (await passwordGrant({ scope: 'admin' })).json()) as { error: string }).error).toBe('invalid_scope');
  });

  test('stops after too many failures of a client on an account, even with the right password', async () => {
    const attempt = (password: string, client: string) =>
      form('/oauth/token', { grant_type: 'password', client_id: CLIENT, username: USER, password }, client);

    for (let i = 0; i < 10; i++) expect((await attempt('wrong', '10.1.0.2')).status).toBe(400);
    expect((await attempt(PASSWORD, '10.1.0.2')).status).toBe(429);
    expect((await attempt(PASSWORD, '10.1.0.3')).status).toBe(200);
  });

  test('keeps no token in clear', async () => {
    const { access_token, refresh_token } = await login();
    const dump = JSON.stringify(database.query('SELECT * FROM oauth_grant').all());
    expect(dump).not.toContain(access_token);
    expect(dump).not.toContain(refresh_token);
  });
});

describe('the refresh grant', () => {
  const refresh = (token: string, client = CLIENT) =>
    form('/oauth/token', { grant_type: 'refresh_token', client_id: client, refresh_token: token });

  test('gives new tokens, the previous access token ending', async () => {
    const first = await login();
    const response = await refresh(first.refresh_token);
    expect(response.status).toBe(200);

    const second = (await response.json()) as Tokens;
    expect(second.refresh_token).not.toBe(first.refresh_token);
    expect((await me(second.access_token)).status).toBe(200);
    expect((await me(first.access_token)).status).toBe(401);
  });

  test('used twice, ends the whole login', async () => {
    const first = await login();
    const second = (await (await refresh(first.refresh_token)).json()) as Tokens;

    const replayed = await refresh(first.refresh_token);
    expect(replayed.status).toBe(400);
    expect(((await replayed.json()) as { error: string }).error).toBe('invalid_grant');

    expect((await me(second.access_token)).status).toBe(401);
    expect((await refresh(second.refresh_token)).status).toBe(400);
  });

  test('belongs to the client it was given to', async () => {
    const { refresh_token } = await login();
    expect((await refresh(refresh_token, 'api-docs')).status).toBe(400);
    expect((await refresh(refresh_token)).status).toBe(200);
  });

  test('refuses what it does not know', async () => {
    expect((await refresh('nothing')).status).toBe(400);
  });

  test('expires, and so do access tokens', () => {
    const now = 1_000_000;
    const tokens = issueTokens(USER, CLIENT, 'shout:write', now);
    expect(authenticate(tokens.access_token, now + (ACCESS_TOKEN_SECONDS - 1) * 1000)?.username).toBe(USER);
    expect(authenticate(tokens.access_token, now + ACCESS_TOKEN_SECONDS * 1000)).toBeNull();
    expect(refreshTokens(tokens.refresh_token, CLIENT, now + 91 * 24 * 60 * 60 * 1000)).toBeNull();
  });
});

describe('revoking', () => {
  test('ends the login, from either token', async () => {
    for (const which of ['access_token', 'refresh_token'] as const) {
      const tokens = await login();
      const response = await form('/oauth/revoke', { token: tokens[which], client_id: CLIENT });
      expect(response.status).toBe(200);
      expect((await me(tokens.access_token)).status).toBe(401);
    }
  });

  test('answers the same for what it does not know', async () => {
    expect((await form('/oauth/revoke', { token: 'nothing', client_id: CLIENT })).status).toBe(200);
  });

  test('leaves the logins of other clients', async () => {
    const tokens = await login();
    await form('/oauth/revoke', { token: tokens.access_token, client_id: 'api-docs' });
    expect((await me(tokens.access_token)).status).toBe(200);
  });
});

describe('/api/v1', () => {
  test('tells who the token is for', async () => {
    const { access_token } = await login();
    expect(await (await me(access_token)).json()).toEqual({ username: USER, scopes: ['library:write', 'shout:write'] });
  });

  test('refuses without a token, as RFC 9457 and RFC 6750 tell', async () => {
    const response = await handle(new Request(`${base}/api/v1/me`));
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(((await response.json()) as { status: number }).status).toBe(401);
  });

  test('replaces the library, telling when nothing changed', async () => {
    const { access_token } = await login();
    const library = JSON.stringify([{ Name: 'One', Album: 'First', 'Album Artist': 'Artist', Genre: 'Rock', Year: 1997 }]);

    expect(await (await putLibrary(access_token, library)).json()).toEqual({ changed: true });
    expect(await (await putLibrary(access_token, library)).json()).toEqual({ changed: false });
    expect((await handle(new Request(`${base}/u/${USER}`))).headers.get('content-type')).toStartWith('text/html');
  });

  test('refuses what is no library', async () => {
    const { access_token } = await login();
    const response = await putLibrary(access_token, 'not json');
    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
  });

  test('shouts, keeping what is not one', async () => {
    const { access_token } = await login();
    const shout = { date: new Date().toISOString(), artist: 'Artist', album: 'Album', name: 'Track' };
    expect(await (await postShout(access_token, shout)).json()).toEqual({ sent: true });
    expect(JSON.parse(latestShout(USER) ?? '{}').name).toBe('Track');
  });

  test('keeps to the scopes of the token', async () => {
    const { access_token } = await login({ scope: 'shout:write' });
    expect((await putLibrary(access_token, '[]')).status).toBe(403);
    expect((await postShout(access_token, { artist: 'Artist' })).status).toBe(200);
  });

  test('is documented, with how to get a token', async () => {
    const document = (await (await handle(new Request(`${base}/api/openapi.json`))).json()) as {
      paths: Record<string, unknown>;
      components: { securitySchemes: { oauth: { flows: { password: { tokenUrl: string; scopes: Record<string, string> } } } } };
    };
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(['/oauth/token', '/oauth/revoke', '/api/v1/me', '/api/v1/me/library']),
    );
    expect(document.components.securitySchemes.oauth.flows.password.tokenUrl).toBe('/oauth/token');
    expect(Object.keys(document.components.securitySchemes.oauth.flows.password.scopes)).toContain('shout:write');
  });
});

describe('scopes', () => {
  test('are all of them when none are asked', () => {
    expect(parseScope(undefined)).toBe('library:write shout:write');
    expect(parseScope('')).toBe('library:write shout:write');
  });

  test('are those asked, when they exist', () => {
    expect(parseScope('shout:write')).toBe('shout:write');
    expect(parseScope('shout:write admin')).toBeNull();
  });
});
