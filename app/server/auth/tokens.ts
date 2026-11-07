// OAuth tokens : what an application gets in exchange for a user's password, then uses instead of it.
// Each login of an application is a "grant", with its current tokens. Only their hashes are kept : they are random, so a plain hash is enough

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { database } from '../db';

export const SCOPES = {
  'library:write': "replace the user's library",
  'shout:write': 'tell what the user is listening to',
} as const;

export type Scope = keyof typeof SCOPES;

export const ACCESS_TOKEN_SECONDS = 60 * 60;
const REFRESH_TOKEN_MS = 90 * 24 * 60 * 60 * 1000;

database.run(`CREATE TABLE IF NOT EXISTS oauth_grant (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  clientId TEXT NOT NULL,
  scope TEXT NOT NULL,
  accessHash TEXT NOT NULL UNIQUE,
  accessExpiresAt INTEGER NOT NULL,
  refreshHash TEXT NOT NULL UNIQUE,
  previousRefreshHash TEXT,
  refreshExpiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
)`);
database.run('CREATE INDEX IF NOT EXISTS oauth_grant_previous ON oauth_grant (previousRefreshHash)');

interface Grant {
  id: string;
  username: string;
  clientId: string;
  scope: string;
  accessExpiresAt: number;
  refreshHash: string;
  refreshExpiresAt: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

const newToken = () => randomBytes(32).toString('base64url');
const hashOf = (token: string) => createHash('sha256').update(token).digest('hex');

const tokenResponse = (accessToken: string, refreshToken: string, scope: string): TokenResponse => ({
  access_token: accessToken,
  refresh_token: refreshToken,
  token_type: 'Bearer',
  expires_in: ACCESS_TOKEN_SECONDS,
  scope,
});

// the scopes asked for, all without any, null if one does not exist
export function parseScope(asked: string | undefined): string | null {
  const known = Object.keys(SCOPES);
  const scopes = asked?.split(' ').filter(Boolean) ?? [];
  if (scopes.some(scope => !known.includes(scope))) return null;
  return (scopes.length ? scopes : known).join(' ');
}

export function issueTokens(username: string, clientId: string, scope: string, now = Date.now()): TokenResponse {
  database.run('DELETE FROM oauth_grant WHERE refreshExpiresAt <= ?', [now]);

  const accessToken = newToken();
  const refreshToken = newToken();
  database.run(
    `INSERT INTO oauth_grant (id, username, clientId, scope, accessHash, accessExpiresAt, refreshHash, refreshExpiresAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      username,
      clientId,
      scope,
      hashOf(accessToken),
      now + ACCESS_TOKEN_SECONDS * 1000,
      hashOf(refreshToken),
      now + REFRESH_TOKEN_MS,
      now,
    ],
  );
  return tokenResponse(accessToken, refreshToken, scope);
}

const revokeGrant = (id: string) => database.run('DELETE FROM oauth_grant WHERE id = ?', [id]);

// new tokens for a refresh token, which only works once. Using one again means it was stolen, or the tokens taken from it were :
// nothing tells who is who, so the grant ends, and its application asks to log in again
export function refreshTokens(refreshToken: string, clientId: string, now = Date.now()): TokenResponse | null {
  const hash = hashOf(refreshToken);

  const replayed = database.query<Pick<Grant, 'id'>, [string]>('SELECT id FROM oauth_grant WHERE previousRefreshHash = ?').get(hash);
  if (replayed) {
    revokeGrant(replayed.id);
    return null;
  }

  const grant = database.query<Grant, [string]>('SELECT * FROM oauth_grant WHERE refreshHash = ?').get(hash);
  if (!grant || grant.clientId !== clientId || grant.refreshExpiresAt <= now) return null;

  const accessToken = newToken();
  const nextRefreshToken = newToken();
  database.run(
    `UPDATE oauth_grant SET accessHash = ?, accessExpiresAt = ?, refreshHash = ?, previousRefreshHash = ?, refreshExpiresAt = ? WHERE id = ?`,
    [hashOf(accessToken), now + ACCESS_TOKEN_SECONDS * 1000, hashOf(nextRefreshToken), hash, now + REFRESH_TOKEN_MS, grant.id],
  );
  return tokenResponse(accessToken, nextRefreshToken, grant.scope);
}

// who an access token stands for, and what it allows
export function authenticate(accessToken: string, now = Date.now()): { username: string; scopes: string[] } | null {
  const grant = database.query<Grant, [string]>('SELECT * FROM oauth_grant WHERE accessHash = ?').get(hashOf(accessToken));
  if (!grant || grant.accessExpiresAt <= now) return null;
  return { username: grant.username, scopes: grant.scope.split(' ') };
}

// ends the grant of either of its tokens, of this application only. Nothing happens for what is unknown : RFC 7009 answers the same
export function revokeToken(token: string, clientId: string) {
  const hash = hashOf(token);
  const grant = database
    .query<Grant, [string, string]>('SELECT * FROM oauth_grant WHERE accessHash = ? OR refreshHash = ?')
    .get(hash, hash);
  if (grant?.clientId === clientId) revokeGrant(grant.id);
}
