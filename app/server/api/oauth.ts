// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// OAuth (RFC 6749), for the application itself : it asks for the password once, which it then forgets

import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import { ACCESS_TOKEN_SECONDS, issueTokens, parseScope, refreshTokens, revokeToken, SCOPES } from '../auth/tokens';
import { checkCredentials } from '../auth/users';
import { COMPANION_APP_NAME } from '../config';
import { base } from './base';

// public clients, as an installed application cannot keep a secret
const OAUTH_CLIENTS = [COMPANION_APP_NAME.toLowerCase(), 'api-docs'];

const NO_STORE = { 'cache-control': 'no-store' };

// answered as RFC 6749 tells (router.ts)
function oauthError(error: string, description: string, status = 400) {
  return new ORPCError('OAUTH', { status, message: description, data: { error } });
}

const tokens = (body: ReturnType<typeof issueTokens>) => ({ status: 200 as const, headers: NO_STORE, body });

const errorSchema = { type: 'object', properties: { error: { type: 'string' }, error_description: { type: 'string' } } } as const;

export const tokenRoute = base
  .route({
    method: 'POST',
    path: '/oauth/token',
    tags: ['OAuth'],
    summary: 'Get tokens',
    description:
      'From a password (grant_type=password, its first and only use), or a refresh token (grant_type=refresh_token), which works once and comes back with the new tokens. ' +
      `The access token lasts ${ACCESS_TOKEN_SECONDS / 60} minutes.`,
    inputStructure: 'detailed',
    outputStructure: 'detailed',
    spec: operation => ({
      ...operation,
      responses: {
        200: { description: 'the tokens' },
        400: { description: 'refused', content: { 'application/json': { schema: errorSchema } } },
        429: {
          description: 'too many failed attempts from this client on this account',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
  })
  .input(
    z.object({
      body: z.object({
        grant_type: z.string().optional().describe('"password" or "refresh_token"'),
        client_id: z.string().optional().describe(`"${COMPANION_APP_NAME.toLowerCase()}"`),
        username: z.string().optional(),
        password: z.string().optional(),
        refresh_token: z.string().optional(),
        scope: z.string().optional().describe('those asked for, separated by spaces : all of them if none'),
      }),
    }),
  )
  .output(
    z.object({
      status: z.literal(200),
      headers: z.object({ 'cache-control': z.string() }),
      body: z.object({
        access_token: z.string(),
        refresh_token: z.string(),
        token_type: z.literal('Bearer'),
        expires_in: z.number(),
        scope: z.string(),
      }),
    }),
  )
  .handler(async ({ input: { body }, context: { tr, clientIp } }) => {
    if (!body.client_id || !OAUTH_CLIENTS.includes(body.client_id)) throw oauthError('invalid_client', 'Unknown client', 401);

    if (body.grant_type === 'refresh_token') {
      const refreshed = refreshTokens(body.refresh_token ?? '', body.client_id);
      if (!refreshed) throw oauthError('invalid_grant', 'This refresh token is no longer valid');
      return tokens(refreshed);
    }
    if (body.grant_type !== 'password') throw oauthError('unsupported_grant_type', 'Expects "password" or "refresh_token"');

    const scope = parseScope(body.scope);
    if (scope === null) throw oauthError('invalid_scope', `Expects some of : ${Object.keys(SCOPES).join(' ')}`);

    const username = (body.username ?? '').trim().toLowerCase();
    const { refusal, blocked } = await checkCredentials(username, body.password ?? '', clientIp, tr);
    if (blocked) throw oauthError('invalid_grant', tr('e_too_many'), 429);
    if (refusal !== null) throw oauthError('invalid_grant', tr('e_log_wrongpass'));

    return tokens(issueTokens(username, body.client_id, scope));
  });

export const revokeRoute = base
  .route({
    method: 'POST',
    path: '/oauth/revoke',
    tags: ['OAuth'],
    summary: 'Log out',
    description: 'Ends the tokens of this login, from either of them (RFC 7009) : an unknown token gets the same answer.',
    inputStructure: 'detailed',
    outputStructure: 'detailed',
  })
  .input(z.object({ body: z.object({ token: z.string().optional(), client_id: z.string().optional() }) }))
  .output(z.object({ status: z.literal(200), body: z.object({}) }))
  .handler(({ input: { body } }) => {
    if (body.token && body.client_id) revokeToken(body.token, body.client_id);
    return { status: 200 as const, body: {} };
  });
