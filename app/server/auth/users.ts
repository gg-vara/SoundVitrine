// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Users : their accounts in the database (see auth.ts), and a folder per user, whose files are served under /data/users/<user>/

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_BACKGROUND_COLORS, STATE_FOLDER_PATH } from '../config';
import { database } from '../db';

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

// the username of a user, by the identifier Better Auth gives it
export function usernameOfId(id: string): string | undefined {
  return database.query<{ username: string }, [string]>('SELECT username FROM user WHERE id = ?').get(id)?.username;
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
