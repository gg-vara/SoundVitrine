// From the state of former versions into the database, at startup : users.json with its plain text passwords, and the shout files.
// Safe to run again : what is already there is left alone

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { auth } from './auth';
import { STATE_FOLDER_PATH } from './config';
import { librarySha1, saveLatestShout, saveLibraryRecord } from './db';
import { libraryPath } from './library';
import { allUsers, findUser, userFolder } from './users';

interface LegacyUser {
  password?: unknown;
  email?: unknown;
  customColors?: unknown;
  profilePic?: unknown;
}

const LEGACY_USERS_FILE = 'users.json';
const SHOUT_FILE = 'shout.json';

const isEmail = (value: unknown): value is string => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function migrateUsers(legacyPath: string) {
  const legacy = JSON.parse(readFileSync(legacyPath, 'utf8')) as Record<string, LegacyUser>;
  const context = await auth.$context;
  const emails = new Set<string>();

  for (const [key, data] of Object.entries(legacy)) {
    const username = key.toLowerCase();
    if (findUser(username)) continue;

    if (typeof data.password !== 'string' || !data.password) {
      console.warn(`Migration : "${key}" has no password, and is left out`);
      continue;
    }

    // an email is required and must be unique, which former versions did not enforce
    const email = isEmail(data.email) ? data.email.toLowerCase() : undefined;
    const isFreeEmail = email !== undefined && !emails.has(email) && !(await context.internalAdapter.findUserByEmail(email));
    if (email) emails.add(email);

    const user = await context.internalAdapter.createUser(
      {
        name: username,
        email: isFreeEmail ? email : `${username}@users.soundvitrine.invalid`,
        emailVerified: false,
        username,
        displayUsername: username,
        customColors: Array.isArray(data.customColors) ? JSON.stringify(data.customColors) : null,
        profilePic: typeof data.profilePic === 'string' ? data.profilePic : null,
      },
      { method: 'email-password' },
    );
    await context.internalAdapter.linkAccount({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: await context.password.hash(data.password),
    });
  }

  // kept for a return to a former version, but it holds passwords in plain text
  renameSync(legacyPath, `${legacyPath}.migrated`);
  console.warn(
    `Migration : users moved to the database. Delete ${legacyPath}.migrated, which holds their passwords in plain text, once all is fine`,
  );
}

function migrateUserFiles(username: string) {
  const shoutPath = join(userFolder(username), SHOUT_FILE);
  if (existsSync(shoutPath)) {
    saveLatestShout(username, readFileSync(shoutPath, 'utf8'), statSync(shoutPath).mtimeMs);
    rmSync(shoutPath);
  }

  const library = libraryPath(username);
  if (existsSync(library) && !librarySha1(username)) {
    saveLibraryRecord(username, createHash('sha1').update(readFileSync(library)).digest('hex'), statSync(library).mtimeMs);
  }
}

export async function migrateLegacyState() {
  const legacyPath = join(STATE_FOLDER_PATH, LEGACY_USERS_FILE);
  if (existsSync(legacyPath)) await migrateUsers(legacyPath);

  for (const { username } of allUsers()) migrateUserFiles(username);
}
