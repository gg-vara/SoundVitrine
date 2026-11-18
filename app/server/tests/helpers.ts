// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the tests of the server share

import { storeLibrary } from '../api/uploads';
import { prepareState } from '../app';
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
  await storeLibrary(USER, new File([library.replace('First', 'Second')], 'library.json'));
}
