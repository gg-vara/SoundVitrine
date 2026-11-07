// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The live shouts of a user, for the library page

import { eventIterator, ORPCError } from '@orpc/server';
import { userExists } from '../auth/users';
import { COMPANION_APP_NAME, SHOUT_PROFILE_FILE_NAME } from '../config';
import { ShoutSchema, shoutsOf } from '../library/shouts';
import { base, userParams } from './base';

export const shoutsRoute = base
  .route({
    method: 'GET',
    path: '/u/{user}/shouts',
    tags: ['Library'],
    summary: 'Live shouts',
    description: `The shouts of the user from now on, as ${COMPANION_APP_NAME} uploads them : server-sent events, each a Shout. The latest one is ${`/data/users/{user}/${SHOUT_PROFILE_FILE_NAME}`}.`,
  })
  .input(userParams)
  .output(eventIterator(ShoutSchema))
  .handler(async function* ({ input, signal, context: { tr } }) {
    const user = input.user.toLowerCase();
    if (!userExists(user)) throw new ORPCError('NOT_FOUND', { message: tr('e_unsu', user) });
    yield* shoutsOf(user, signal);
  });
