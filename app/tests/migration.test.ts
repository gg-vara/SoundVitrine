// From the state of former versions : what PHP left in the state folder, at the first start

import { beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { handle, prepareState } from '../src/app';
import { STATE_FOLDER_PATH } from '../src/config';
import { database, latestShout, librarySha1 } from '../src/db';
import { translator } from '../src/i18n';
import { checkCredentials, findUser, userFolder } from '../src/users';

const tr = translator('en');
const legacyFile = () => join(STATE_FOLDER_PATH, 'users.json');
const shoutJson = '{"date":"2020-01-01T00:00:00Z","name":"Old"}';
const accepted = async (username: string, password: string) =>
  (await checkCredentials(username, password, 'migration', tr)).refusal === null;

beforeAll(async () => {
  writeFileSync(
    legacyFile(),
    JSON.stringify({
      oldcurator: {
        password: 'plaintext-one',
        email: 'Old@Example.com',
        customColors: ['#000000', '#111111', '#222222', '#333333'],
        profilePic: 'pp.png',
      },
      // accepted back then, refused for new accounts : short username and password, no email
      abc: { password: 'short' },
      // the same email as another account
      twin: { password: 'plaintext-two', email: 'old@example.com' },
      invalidmail: { password: 'plaintext-three', email: 'not an email' },
      nopassword: { email: 'none@example.com' },
    }),
  );

  mkdirSync(userFolder('oldcurator'), { recursive: true });
  writeFileSync(join(userFolder('oldcurator'), 'shout.json'), shoutJson);
  writeFileSync(join(userFolder('oldcurator'), 'current.json'), '[]');

  await prepareState();
});

describe('migration of users.json', () => {
  test('passwords still work, wrong ones do not', async () => {
    expect(await accepted('oldcurator', 'plaintext-one')).toBe(true);
    expect(await accepted('oldcurator', 'plaintext-two')).toBe(false);
    expect(await accepted('abc', 'short')).toBe(true);
  });

  test('passwords are not kept in the database in plain text', () => {
    const stored = database.query<{ password: string }, []>('SELECT password FROM account').all();
    expect(stored.length).toBeGreaterThanOrEqual(4);
    for (const { password } of stored) expect(['plaintext-one', 'plaintext-two', 'plaintext-three', 'short']).not.toContain(password);
  });

  test('profiles are kept', () => {
    expect(findUser('oldcurator')).toEqual({
      username: 'oldcurator',
      profilePic: 'pp.png',
      customColors: ['#000000', '#111111', '#222222', '#333333'],
    });
  });

  test('emails that cannot be kept get a placeholder', () => {
    const emailOf = (username: string) =>
      database.query<{ email: string }, [string]>('SELECT email FROM user WHERE username = ?').get(username)?.email;
    expect(emailOf('oldcurator')).toBe('old@example.com');
    expect(emailOf('abc')).toEndWith('.invalid');
    expect(emailOf('twin')).toEndWith('.invalid');
    expect(emailOf('invalidmail')).toEndWith('.invalid');
  });

  test('an account without password is left out', () => {
    expect(findUser('nopassword')).toBeUndefined();
  });

  test('the old file is set aside, with a name that is not served', async () => {
    expect(existsSync(legacyFile())).toBe(false);
    expect(readFileSync(`${legacyFile()}.migrated`, 'utf8')).toContain('plaintext-one');
    expect((await handle(new Request('http://localhost/data/users/..%2fusers.json.migrated'))).status).toBe(404);
  });

  test('the latest shout and library record move to the database', async () => {
    expect(latestShout('oldcurator')).toBe(shoutJson);
    expect(existsSync(join(userFolder('oldcurator'), 'shout.json'))).toBe(false);
    expect(librarySha1('oldcurator')).toBeDefined();

    const served = await handle(new Request('http://localhost/data/users/oldcurator/shout.json'));
    expect(await served.text()).toBe(shoutJson);
  });

  test('starting again changes nothing', async () => {
    const before = database.query<{ id: string }, []>('SELECT id FROM user ORDER BY id').all();
    await prepareState();
    expect(database.query<{ id: string }, []>('SELECT id FROM user ORDER BY id').all()).toEqual(before);
    expect(await accepted('oldcurator', 'plaintext-one')).toBe(true);
  });
});
