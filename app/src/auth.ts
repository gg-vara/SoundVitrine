// Accounts and sessions, by Better Auth : hashed passwords, sessions kept in the database.
// Its HTTP routes are not exposed : the forms of the pages call it directly, so its rules cannot be gone around

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { username } from 'better-auth/plugins/username';
import { APP_NAME, ENFORCE_CANONICAL_HTTP_SCHEME, PORT, STATE_FOLDER_PATH } from './config';
import { database } from './db';

// the signing key : SOUNDVITRINE_SESSION_SECRET, else one generated once, kept in the state folder
function loadSecret(): string {
  if (process.env.SOUNDVITRINE_SESSION_SECRET) return process.env.SOUNDVITRINE_SESSION_SECRET;

  const path = join(STATE_FOLDER_PATH, 'session.key');
  if (!existsSync(path)) writeFileSync(path, randomBytes(32).toString('base64'), { mode: 0o600 });
  return readFileSync(path, 'utf8').trim();
}

export const auth = betterAuth({
  appName: APP_NAME,
  database,
  secret: loadSecret(),
  // nothing is built from it, as the HTTP routes are not exposed
  baseURL: `http://localhost:${PORT}`,
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
    username({
      // the accounts of former versions may be shorter : the creation form has its own rule (see accountRules)
      minUsernameLength: 1,
      maxUsernameLength: 64,
      usernameValidator: name => /^[a-zA-Z0-9]+([_-]?[a-zA-Z0-9])*$/.test(name),
    }),
  ],
});

// creates or completes the tables of Better Auth
export async function prepareAuth() {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
}
