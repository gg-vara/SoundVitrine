// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What OAuth opens : errors come as application/problem+json (router.ts)

import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import type { Scope } from '../auth/tokens';
import { authenticate, SCOPES } from '../auth/tokens';
import { userExists } from '../auth/users';
import { base } from './base';
import { storeLibrary, storeShout } from './uploads';

const SECURITY = 'oauth';

const authorization = z.object({ authorization: z.string().optional().describe('Bearer <access token>') });

function userAllowedTo(scope: Scope | null, header: string | undefined) {
  const token = /^Bearer (\S+)$/i.exec(header ?? '')?.[1];
  const caller = token ? authenticate(token) : null;
  if (!caller || !userExists(caller.username)) throw new ORPCError('UNAUTHORIZED', { message: 'Missing, unknown or expired access token' });
  if (scope && !caller.scopes.includes(scope)) throw new ORPCError('FORBIDDEN', { message: `This token does not allow ${scope}` });
  return caller;
}

export const meRoute = base
  .route({
    method: 'GET',
    path: '/api/v1/me',
    tags: ['API'],
    summary: 'Who the token is for',
    description: 'Also tells that an access token still works.',
    inputStructure: 'detailed',
    spec: operation => ({ ...operation, security: [{ [SECURITY]: [] }] }),
  })
  .input(z.object({ headers: authorization }))
  .output(z.object({ username: z.string(), scopes: z.array(z.string()) }))
  .handler(({ input: { headers } }) => userAllowedTo(null, headers.authorization));

export const putLibraryRoute = base
  .route({
    method: 'PUT',
    path: '/api/v1/me/library',
    tags: ['API'],
    summary: 'Replace the library',
    description: 'The tracks, as JSON, or compressed, as told from the content (MSZIP buffer, zlib, gzip or raw deflate).',
    inputStructure: 'detailed',
    spec: operation => ({ ...operation, security: [{ [SECURITY]: ['library:write' satisfies Scope] }] }),
  })
  .input(z.object({ headers: authorization, body: z.object({ file: z.file().describe('the library') }) }))
  .output(z.object({ changed: z.boolean().describe('false when identical to the current library') }))
  .handler(async ({ input: { headers, body }, context: { tr } }) => {
    const { username } = userAllowedTo('library:write', headers.authorization);
    const stored = await storeLibrary(username, body.file);
    if (stored === 'invalid') throw new ORPCError('UNPROCESSABLE_CONTENT', { status: 422, message: tr('e_ucJSON') });
    return { changed: stored === 'stored' };
  });

export const postShoutRoute = base
  .route({
    method: 'POST',
    path: '/api/v1/me/shouts',
    tags: ['API'],
    summary: 'Shout what is playing',
    description: "Sent live to the visitors of the user's library page, if it is a Shout, and kept anyway.",
    inputStructure: 'detailed',
    spec: operation => ({ ...operation, security: [{ [SECURITY]: ['shout:write' satisfies Scope] }] }),
  })
  .input(z.object({ headers: authorization, body: z.record(z.string(), z.unknown()).describe('see the Shout schema') }))
  .output(z.object({ sent: z.boolean().describe('whether it went out live') }))
  .handler(({ input: { headers, body } }) => {
    const { username } = userAllowedTo('shout:write', headers.authorization);
    return { sent: storeShout(username, JSON.stringify(body)) };
  });

// how the API's reference tells to get a token
export const securitySchemes = {
  [SECURITY]: {
    type: 'oauth2' as const,
    flows: {
      password: {
        tokenUrl: '/oauth/token',
        refreshUrl: '/oauth/token',
        scopes: SCOPES,
        // what Scalar fills in, as it would send its client in a header
        'x-scalar-client-id': 'api-docs',
        'x-scalar-credentials-location': 'body',
      },
    },
  },
};
