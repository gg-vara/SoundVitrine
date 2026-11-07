// Users : their accounts in the database (see auth.ts), and a folder per user, whose files are served under /data/users/<user>/

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_BACKGROUND_COLORS, STATE_FOLDER_PATH } from '../config';
import { database } from '../db';
import type { Translator } from '../i18n/i18n';
import { auth } from './auth';
import { clearFailures, isBlocked, recordFailure } from './rate-limit';

// what may be shown of a user
export interface User {
  username: string;
  profilePic?: string;
  customColors: string[];
}

interface UserRow {
  id: string;
  username: string;
  profilePic: string | null;
  customColors: string | null;
}

const selectUser = 'SELECT id, username, profilePic, customColors FROM user';

function asUser(row: UserRow): User {
  return {
    username: row.username,
    profilePic: row.profilePic ?? undefined,
    customColors: row.customColors ? (JSON.parse(row.customColors) as string[]) : DEFAULT_BACKGROUND_COLORS,
  };
}

function findRow(username: string): UserRow | null {
  return database.query<UserRow, [string]>(`${selectUser} WHERE username = ?`).get(username);
}

export function allUsers(): User[] {
  return database.query<UserRow, []>(`${selectUser} ORDER BY createdAt, rowid`).all().map(asUser);
}

export function findUser(username: string): User | undefined {
  const row = findRow(username);
  return row ? asUser(row) : undefined;
}

export function updateProfile(username: string, changes: { customColors?: string[]; profilePic?: string }) {
  if (changes.customColors) {
    database.run('UPDATE user SET customColors = ? WHERE username = ?', [JSON.stringify(changes.customColors), username]);
  }
  if (changes.profilePic) database.run('UPDATE user SET profilePic = ? WHERE username = ?', [changes.profilePic, username]);
}

//
// Folders
//

// internal folder of a user's files
export function userFolder(username: string): string {
  return join(STATE_FOLDER_PATH, 'users', username);
}

// URL of a user's files
export function publicUserFolder(username: string): string {
  return `/data/users/${username}/`;
}

export function ensureUserFolders() {
  for (const { username } of allUsers()) mkdirSync(userFolder(username), { recursive: true });
}

// set up properly : in the database, with its folder
export function userExists(username: string): boolean {
  return findRow(username) !== null && existsSync(userFolder(username));
}

//
// Passwords, as SoundBuddy sends them with each of its calls
//

async function isPasswordOf(username: string, password: string): Promise<boolean> {
  const row = findRow(username);
  if (!row) return false;

  const context = await auth.$context;
  const hash = (await context.internalAdapter.findCredentialAccount(row.id))?.password;
  return hash ? context.password.verify({ hash, password }) : false;
}

export interface CredentialsCheck {
  // why the credentials are refused, if so
  refusal: string | null;
  // too many failures of this client : the password was not even looked at
  blocked: boolean;
}

// "clientIp" being the origin of the call, for the failures it may accumulate (see rate-limit.ts)
export async function checkCredentials(username: string, password: string, clientIp: string, tr: Translator): Promise<CredentialsCheck> {
  const refused = (refusal: string, blocked = false) => ({ refusal, blocked });

  if (!username) return refused(tr('e_log_nouser'));
  if (!password) return refused(tr('e_nopass'));
  if (!findRow(username)) return refused(tr('e_unsu', username));
  if (isBlocked(clientIp, username)) return refused(tr('e_too_many'), true);

  if (!(await isPasswordOf(username, password))) {
    recordFailure(clientIp, username);
    return refused(tr('e_pmm'));
  }

  clearFailures(clientIp, username);
  return { refusal: null, blocked: false };
}
