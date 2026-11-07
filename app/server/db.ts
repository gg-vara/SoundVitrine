// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The database of the state folder (soundvitrine.db) : users and sessions (see auth.ts), the latest shouts, and what is known of the
// uploaded libraries. Libraries and profile pictures stay files, in the folder of each user

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_FOLDER_PATH } from './config';

mkdirSync(STATE_FOLDER_PATH, { recursive: true });

export const database = new Database(join(STATE_FOLDER_PATH, 'soundvitrine.db'), { create: true });

database.run('PRAGMA journal_mode = WAL');
database.run('PRAGMA busy_timeout = 5000');

database.run('CREATE TABLE IF NOT EXISTS shout (username TEXT PRIMARY KEY, json TEXT NOT NULL, updatedAt INTEGER NOT NULL)');
database.run('CREATE TABLE IF NOT EXISTS library (username TEXT PRIMARY KEY, sha1 TEXT NOT NULL, uploadedAt INTEGER NOT NULL)');

export function saveLatestShout(username: string, json: string, at = Date.now()) {
  database.run('INSERT OR REPLACE INTO shout (username, json, updatedAt) VALUES (?, ?, ?)', [username, json, at]);
}

export function latestShout(username: string): string | undefined {
  return database.query<{ json: string }, [string]>('SELECT json FROM shout WHERE username = ?').get(username)?.json;
}

export function saveLibraryRecord(username: string, sha1: string, at = Date.now()) {
  database.run('INSERT OR REPLACE INTO library (username, sha1, uploadedAt) VALUES (?, ?, ?)', [username, sha1, at]);
}

export function librarySha1(username: string): string | undefined {
  return database.query<{ sha1: string }, [string]>('SELECT sha1 FROM library WHERE username = ?').get(username)?.sha1;
}
