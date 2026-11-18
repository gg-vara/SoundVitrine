// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Accounts and sessions, by Better Auth : hashed passwords, sessions kept in the database. And OAuth (its oauth-provider plugin) :
// applications log in through the browser, with PKCE, and get access tokens for /api/v1 as JWTs, which it verifies itself
// (server/auth/access.ts). They do not depend on the browser's session : logging out of the site leaves the applications connected.
// Of its HTTP routes, only OAuth's are exposed (server/app.ts) : the forms of the pages call it directly, so its rules cannot be gone around

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { oauthProvider } from '@better-auth/oauth-provider';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { jwt } from 'better-auth/plugins/jwt';
import { username } from 'better-auth/plugins/username';
import { APP_NAME, COMPANION_APP_NAME, ENFORCE_CANONICAL_HTTP_SCHEME, PUBLIC_URL, STATE_FOLDER_PATH } from '../config';
import { database } from '../db';
import { SCOPE_NAMES } from './scopes';

// the signing key : SOUNDVITRINE_SESSION_SECRET, else one generated once, kept in the state folder
function loadSecret(): string {
  if (process.env.SOUNDVITRINE_SESSION_SECRET) return process.env.SOUNDVITRINE_SESSION_SECRET;

  const path = join(STATE_FOLDER_PATH, 'session.key');
  if (!existsSync(path)) writeFileSync(path, randomBytes(32).toString('base64'), { mode: 0o600 });
  return readFileSync(path, 'utf8').trim();
}

// the applications, known in advance : SoundBuddy and the API's reference log in through the browser, without a secret (public clients)
export const SOUNDBUDDY_CLIENT_ID = 'soundbuddy';
export const API_DOCS_CLIENT_ID = 'api-docs';
// what the access tokens are for : their audience, which applications name as the resource they ask for (RFC 8707)
export const API_RESOURCE = `${PUBLIC_URL}/api/v1`;
// short-lived : revoking an application's login stops its refresh token, while the access token it holds lasts until then
const ACCESS_TOKEN_SECONDS = 10 * 60;

export const auth = betterAuth({
  appName: APP_NAME,
  database,
  secret: loadSecret(),
  baseURL: PUBLIC_URL,
  logger: { level: 'error' },
  telemetry: { enabled: false },
  // the JWT plugin's own route : access tokens come from OAuth's
  disabledPaths: ['/token'],
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
  session: { expiresIn: 60 * 60 * 24 * 30 },
  // HTTPS comes from the proxy in front of the server, which it cannot see
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production' && !ENFORCE_CANONICAL_HTTP_SCHEME,
    // prepareAuth() brings the tables up to date at each start, right after this first check would complain
    database: { validateSchema: false },
  },
  user: {
    additionalFields: {
      customColors: { type: 'string', required: false, input: false },
      profilePic: { type: 'string', required: false, input: false },
    },
  },
  plugins: [
    // signs the access tokens, with keys it keeps in the database
    jwt(),
    oauthProvider({
      // pages of server/oauth.ts
      loginPage: '/oauth/login',
      consentPage: '/oauth/consent',
      scopes: [...SCOPE_NAMES],
      grantTypes: ['authorization_code', 'refresh_token'],
      resources: [{ identifier: API_RESOURCE, accessTokenTtl: ACCESS_TOKEN_SECONDS }],
      // every application known in advance may ask for the API
      enforcePerClientResources: false,
    }),
    username({
      minUsernameLength: 6,
      maxUsernameLength: 20,
      usernameValidator: name => /^[a-zA-Z0-9]+([_-]?[a-zA-Z0-9])*$/.test(name),
    }),
  ],
});

// creates or completes the tables of Better Auth
export async function prepareAuth() {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  await ensureClients();
}

// a client is otherwise created by a logged-in user, who owns it : these belong to no one
async function ensureClients() {
  const { adapter } = await auth.$context;
  const common = { responseTypes: ['code'], disabled: false, skipConsent: false, createdAt: new Date(), updatedAt: new Date() };
  const clients = [
    {
      clientId: SOUNDBUDDY_CLIENT_ID,
      name: COMPANION_APP_NAME,
      // any port : a native application's loopback address (RFC 8252)
      redirectUris: ['http://127.0.0.1/callback'],
      tokenEndpointAuthMethod: 'none',
      applicationType: 'native',
      grantTypes: ['authorization_code', 'refresh_token'],
      scopes: [...SCOPE_NAMES],
      requirePKCE: true,
    },
    {
      clientId: API_DOCS_CLIENT_ID,
      name: `${APP_NAME} API`,
      // Scalar returns to its own page
      redirectUris: [`${PUBLIC_URL}/api/docs`],
      tokenEndpointAuthMethod: 'none',
      applicationType: 'web',
      grantTypes: ['authorization_code', 'refresh_token'],
      scopes: [...SCOPE_NAMES],
      requirePKCE: true,
    },
  ];

  for (const client of clients) {
    const where = [{ field: 'clientId', value: client.clientId }];
    const existing = await adapter.findOne<{ redirectUris?: string[] }>({ model: 'oauthClient', where });
    if (!existing) {
      await adapter.create({ model: 'oauthClient', data: { ...common, ...client } });
    } else if (JSON.stringify(existing.redirectUris ?? []) !== JSON.stringify(client.redirectUris)) {
      // the public address changed
      await adapter.update({ model: 'oauthClient', where, update: { redirectUris: client.redirectUris, updatedAt: new Date() } });
    }
  }
}
