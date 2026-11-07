// What the tests of the server share

import { expect } from 'bun:test';
import { handle, prepareState } from '../app';
import { auth } from '../auth/auth';
import { userExists } from '../auth/users';

export const USER = 'curator';
export const PASSWORD = 'password1';
export const base = 'http://localhost';
export const library = JSON.stringify([
  {
    Name: 'One',
    Album: 'First',
    'Album Artist': 'Artist',
    Genre: 'Rock',
    Year: 1997,
    'Disc Number': 1,
    'Track Number': 1,
    'Date Added': '2020-01-01T00:00:00Z',
  },
]);

export const soundBuddyHeaders = { 'X-Client-Id': 'SoundBuddy', 'X-Client-Version': '0.11.0', 'Accept-Language': 'en' };

export function credentials(fields: Record<string, string>, headers: Record<string, string> = soundBuddyHeaders) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return handle(new Request(`${base}/hb/creds`, { method: 'POST', body: form, headers }));
}

// the very bytes SoundBuddy sends (src/net/Multipart.h, src/net/UploadHelper.h)
export function upload(action: string, field: string, content: string | Uint8Array, type: string, extra: Record<string, string> = {}) {
  const boundary = '----SoundBuddyBoundaryabcdefghijklmnopqrstuvwx';
  const extension = type === 'application/json' ? '.json' : '.zmlib';
  const fields = Object.entries({ password: PASSWORD, headless: '1', ...extra })
    .map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
    .join('');
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${field}${extension}"\r\nContent-Type: ${type}\r\n\r\n`,
    ),
    Buffer.from(content),
    Buffer.from(`\r\n${fields}--${boundary}--\r\n`),
  ]);
  const headers = { 'Accept-Language': 'en', 'Content-Type': `multipart/form-data; boundary=${boundary}` };
  return handle(new Request(`${base}/u/${USER}/${action}`, { method: 'POST', body, headers }));
}

export const uploadLibrary = (content: string | Uint8Array, type = 'application/json', extra?: Record<string, string>) =>
  upload('uploadMusicLibrary', 'SoundVitrine_file', content, type, extra);

export const shout = (content: string, extra?: Record<string, string>) =>
  upload('uploadShout', 'shout_file', content, 'application/json', extra);

export const expectPlainText = (response: Response) => expect(response.headers.get('content-type')).toStartWith('text/plain');

export const createUser = async (username: string, password = PASSWORD) => {
  await auth.api.signUpEmail({ body: { name: username, username, password, email: `${username}@example.com` } });
  await prepareState();
};

// its state is the file's own if it runs alone, shared when the others run with it
export async function prepareTestUser() {
  await prepareState();
  if (!userExists(USER)) await createUser(USER);
}

// for what shows or serves a library. Not the one above, which the upload tests expect to be new
export async function prepareTestLibrary() {
  await prepareTestUser();
  await uploadLibrary(library.replace('First', 'Second'));
}
