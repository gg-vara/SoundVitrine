// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Accounts and sessions, by Better Auth : hashed passwords, sessions kept in the database. And OAuth (its oauth-provider plugin) :
// applications log in through the browser, with PKCE, and get tokens the API checks (server/auth/access.ts).
// Of its HTTP routes, only OAuth's are exposed (server/app.ts) : the forms of the pages call it directly, so its rules cannot be gone around

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { oauthProvider } from '@better-auth/oauth-provider';
import { betterAuth } from 'better-auth';
import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';
import { getMigrations } from 'better-auth/db/migration';
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
// the API itself, which asks the provider about the tokens it is given (introspection, only answered to a client with a secret)
export const API_CLIENT_ID = 'soundvitrine-api';

export const auth = betterAuth({
  appName: APP_NAME,
  database,
  secret: loadSecret(),
  baseURL: PUBLIC_URL,
  logger: { level: 'error' },
  telemetry: { enabled: false },
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
    oauthProvider({
      // pages of server/oauth.ts
      loginPage: '/oauth/login',
      consentPage: '/oauth/consent',
      scopes: [...SCOPE_NAMES],
      grantTypes: ['authorization_code', 'refresh_token'],
      // opaque access tokens, checked against the database : revoking one takes effect at once
      disableJwtPlugin: true,
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
  const { adapter, secretConfig } = await auth.$context;
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
    {
      clientId: API_CLIENT_ID,
      name: `${APP_NAME} API`,
      redirectUris: [],
      tokenEndpointAuthMethod: 'client_secret_post',
      applicationType: 'web',
      grantTypes: ['client_credentials'],
      scopes: [],
      requirePKCE: false,
      // encrypted with the server's key, as the plugin stores secrets without its JWT plugin
      clientSecret: await symmetricEncrypt({ key: secretConfig, data: randomBytes(32).toString('base64url') }),
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

// the secret of the API's own client, to introspect tokens
let apiSecret: Promise<string> | undefined;
export function apiClientSecret(): Promise<string> {
  apiSecret ??= (async () => {
    const { adapter, secretConfig } = await auth.$context;
    const client = await adapter.findOne<{ clientSecret: string }>({
      model: 'oauthClient',
      where: [{ field: 'clientId', value: API_CLIENT_ID }],
    });
    if (!client) throw new Error('The API has no OAuth client : prepareAuth() was not run');
    return symmetricDecrypt({ key: secretConfig, data: client.clientSecret });
  })();
  return apiSecret;
}
