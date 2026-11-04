// Users : a JSON database (users.json), and a folder per user, whose files are served under /data/users/<user>/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_BACKGROUND_COLORS, STATE_FOLDER_PATH } from './config';
import type { Translator } from './i18n';

export interface User {
  password: string;
  email?: string;
  customColors?: string[];
  profilePic?: string;
}

// what may be shown of a user
export type PublicUser = Omit<User, 'password' | 'email'> & { customColors: string[] };

const databasePath = join(STATE_FOLDER_PATH, 'users.json');

function readAll(): Record<string, User> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(databasePath, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, User>;
  } catch {
    // missing or unreadable : starts empty
  }
  return {};
}

function writeAll(users: Record<string, User>) {
  mkdirSync(dirname(databasePath), { recursive: true });
  writeFileSync(databasePath, JSON.stringify(users, null, 4));
}

export function allUsers(): Record<string, User> {
  return readAll();
}

export function findUser(username: string): User | undefined {
  return readAll()[username];
}

export function publicUser(username: string): PublicUser | undefined {
  const user = findUser(username);
  if (!user) return undefined;
  const { password: _password, email: _email, ...rest } = user;
  return { ...rest, customColors: user.customColors ?? DEFAULT_BACKGROUND_COLORS };
}

// merges "changes" into the user, created if missing
export function updateUser(username: string, changes: Partial<User>) {
  const users = readAll();
  users[username] = { ...users[username], ...changes } as User;
  writeAll(users);
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
  for (const username of Object.keys(readAll())) mkdirSync(userFolder(username), { recursive: true });
}

// set up properly : in the database, with its folder
export function userExists(username: string): boolean {
  return findUser(username) !== undefined && existsSync(userFolder(username));
}

// "null" if the credentials match, else why not
export function checkCredentials(username: string, password: string, tr: Translator): string | null {
  if (!username) return tr('e_log_nouser');
  if (!password) return tr('e_nopass');

  const user = findUser(username);
  if (!user) return tr('e_unsu', username);
  if (password !== user.password) return tr('e_pmm');

  return null;
}
