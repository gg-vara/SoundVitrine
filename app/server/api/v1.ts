// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What OAuth opens : errors come as application/problem+json (router.ts)

import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import { accessOf } from '../auth/access';
import { API_DOCS_CLIENT_ID, API_RESOURCE } from '../auth/auth';
import type { Scope } from '../auth/scopes';
import { SCOPES } from '../auth/scopes';
import { base } from './base';
import { storeLibrary, storeShout } from './uploads';

const SECURITY = 'oauth';

const authorization = z.object({ authorization: z.string().optional().describe('Bearer <access token>') });

async function userAllowedTo(scope: Scope | null, header: string | undefined) {
  const caller = await accessOf(header);
  if (!caller) throw new ORPCError('UNAUTHORIZED', { message: 'Missing, unknown or expired access token' });
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
    const { username } = await userAllowedTo('library:write', headers.authorization);
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
  .handler(async ({ input: { headers, body } }) => {
    const { username } = await userAllowedTo('shout:write', headers.authorization);
    return { sent: storeShout(username, JSON.stringify(body)) };
  });

// how the API's reference gets a token : through the browser, as an application does (Better Auth's OAuth provider, server/auth/auth.ts)
export const securitySchemes = {
  [SECURITY]: {
    type: 'oauth2' as const,
    flows: {
      authorizationCode: {
        authorizationUrl: '/api/auth/oauth2/authorize',
        tokenUrl: '/api/auth/oauth2/token',
        refreshUrl: '/api/auth/oauth2/token',
        scopes: SCOPES,
        'x-scalar-client-id': API_DOCS_CLIENT_ID,
        'x-usePkce': 'SHA-256',
        // tokens are for the API, as an application asks (RFC 8707)
        'x-scalar-security-query': { resource: API_RESOURCE },
        'x-scalar-security-body': { resource: API_RESOURCE },
      },
    },
  },
};
