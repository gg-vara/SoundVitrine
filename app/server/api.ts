// The API of SoundVitrine, described by an OpenAPI document (served at /api/openapi.json, browsable at /api/docs) :
// what released SoundBuddy versions call (multipart forms in, plain text out, the password each time), the live shouts of a user,
// and OAuth with what it opens (/oauth, /api/v1), in JSON

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { eventIterator, ORPCError, os } from '@orpc/server';
import { z } from 'zod';
import { decompressUpload } from './compression';
import {
  APP_NAME,
  COMPANION_APP_NAME,
  COMPRESSED_LIBRARY_CONTENT_TYPE,
  MUSIC_LIB_UPLOAD_FILE_NAME,
  SHOUT_PROFILE_FILE_NAME,
  SHOUT_UPLOAD_FILE_NAME,
} from './config';
import { librarySha1, saveLatestShout, saveLibraryRecord } from './db';
import type { Translator } from './i18n';
import { compileLibrary, libraryPath } from './library';
import { publishShout, ShoutSchema, shoutsOf } from './shouts';
import type { Scope } from './tokens';
import { ACCESS_TOKEN_SECONDS, authenticate, issueTokens, parseScope, refreshTokens, revokeToken, SCOPES } from './tokens';
import { checkCredentials, userExists } from './users';

export interface ApiContext {
  tr: Translator;
  clientIp: string;
}

const base = os.$context<ApiContext>();

//
// Plain text responses
//

// SoundBuddy shows these texts to its users
const textBody = (text: string) => new File([text], 'message.txt', { type: 'text/plain;charset=utf-8' });

const text = (text: string) => ({ status: 200 as const, body: textBody(text) });

// an error, as SoundBuddy expects it : its text, with the status of SoundBuddy's calls ("headless"), else 200 for browser forms
function failure(message: string, headless: boolean) {
  if (headless) throw new ORPCError('UPLOAD_REFUSED', { status: 520, message });
  return text(message);
}

const textContent = { 'text/plain': { schema: { type: 'string' } } } as const;

// OpenAPI responses of a plain text operation, by status
function textResponses(responses: Record<number, string>) {
  return Object.fromEntries(Object.entries(responses).map(([status, description]) => [status, { description, content: textContent }]));
}

//
// Uploads
//

function asJson(text: string): string | undefined {
  try {
    JSON.parse(text);
    return text;
  } catch {
    return undefined;
  }
}

// the uploaded file as JSON text, decompressed if needed; undefined if not JSON.
// Told from its content : Bun's form parser ignores the Content-Type of a file, and deduces one from its file name
async function uploadedJson(file: File): Promise<string | undefined> {
  const data = new Uint8Array(await file.arrayBuffer());
  return asJson(Buffer.from(data).toString('utf8')) ?? asJson(decompressUpload(data)?.toString('utf8') ?? '');
}

// keeps the library, unless it is what is already there. "invalid" when it is not JSON
async function storeLibrary(user: string, file: File): Promise<'invalid' | 'identical' | 'stored'> {
  const json = await uploadedJson(file);
  if (json === undefined) return 'invalid';

  const sha1 = createHash('sha1').update(json).digest('hex');
  if (sha1 === librarySha1(user)) return 'identical';

  await Bun.write(libraryPath(user), json);
  await compileLibrary(user);
  saveLibraryRecord(user, sha1);
  return 'stored';
}

// sent live only if it is one, but kept anyway
function storeShout(user: string, json: string): boolean {
  const shout = ShoutSchema.safeParse(JSON.parse(json));
  if (shout.success) publishShout(user, shout.data);
  saveLatestShout(user, json);
  return shout.success;
}

const userParams = z.object({ user: z.string().describe('the username, case insensitive') });

const uploadForm = (fileField: string, fileDescription: string) =>
  z.object({
    password: z.string().optional().describe("the user's password"),
    headless: z.string().optional().describe('set by SoundBuddy : errors then come with HTTP status 520'),
    [fileField]: z.file().optional().describe(fileDescription),
  });

//
// SoundBuddy
//

export const checkCredentialsRoute = base
  .route({
    method: 'POST',
    path: '/hb/creds',
    tags: ['SoundBuddy'],
    summary: 'Check credentials',
    description: `Heartbeat of ${COMPANION_APP_NAME} : checks a username and password, from ${COMPANION_APP_NAME} only (X-Client-Id).`,
    inputStructure: 'detailed',
    outputStructure: 'detailed',
    spec: operation => ({
      ...operation,
      responses: textResponses({
        200: '"OK" : the credentials are valid',
        400: 'not called by SoundBuddy, or without form',
        403: 'why the credentials are refused',
        429: 'too many failed attempts from this client on this account',
      }),
    }),
  })
  .input(
    z.object({
      headers: z.object({
        'x-client-id': z.string().optional().describe(`must be "${COMPANION_APP_NAME}"`),
        'x-client-version': z.string().optional().describe(`version of ${COMPANION_APP_NAME}`),
      }),
      body: z.object({ username: z.string().optional(), password: z.string().optional() }).optional(),
    }),
  )
  .output(z.object({ status: z.literal(200), body: z.file() }))
  .handler(async ({ input, context: { tr, clientIp } }) => {
    const { headers, body } = input;
    if (!body || (body.username === undefined && body.password === undefined)) throw new ORPCError('BAD_REQUEST', { message: '' });
    if (headers['x-client-id'] !== COMPANION_APP_NAME || headers['x-client-version'] === undefined) {
      throw new ORPCError('BAD_REQUEST', { message: '' });
    }

    const { refusal, blocked } = await checkCredentials((body.username ?? '').trim().toLowerCase(), body.password ?? '', clientIp, tr);
    // not 403 when blocked, which makes SoundBuddy stop trying
    if (blocked) throw new ORPCError('TOO_MANY_REQUESTS', { status: 429, message: refusal ?? '' });
    if (refusal !== null) throw new ORPCError('FORBIDDEN', { message: refusal });

    return text('OK');
  });

export const uploadMusicLibraryRoute = base
  .route({
    method: 'POST',
    path: '/u/{user}/uploadMusicLibrary',
    tags: ['SoundBuddy'],
    summary: 'Upload a music library',
    description:
      `Replaces the library of the user : the tracks ${COMPANION_APP_NAME} exports, as JSON, or compressed, as told from the content ` +
      `(MSZIP buffer of Windows' Compression API, zlib, gzip or raw deflate). ${COMPANION_APP_NAME} sends those as "${COMPRESSED_LIBRARY_CONTENT_TYPE}".`,
    inputStructure: 'detailed',
    outputStructure: 'detailed',
    spec: operation => ({
      ...operation,
      responses: {
        ...textResponses({
          200: 'what happened : the library is updated, or identical to the current one; or, without "headless", why it is refused',
          520: 'why the upload is refused, with "headless"',
        }),
        302: { description: 'without "headless" (browser form) : back to the library page' },
      },
    }),
  })
  .input(z.object({ params: userParams, body: uploadForm(MUSIC_LIB_UPLOAD_FILE_NAME, 'the library : JSON, or compressed JSON') }))
  .output(
    z.union([
      z.object({ status: z.literal(200), body: z.file() }),
      z.object({ status: z.literal(302), headers: z.object({ location: z.string() }) }),
    ]),
  )
  .handler(async ({ input, context: { tr, clientIp } }) => {
    const user = input.params.user.toLowerCase();
    const form = input.body;
    const headless = form.headless !== undefined;
    const file = form[MUSIC_LIB_UPLOAD_FILE_NAME] as File | undefined;

    if (!userExists(user)) return failure(tr('e_unsu', user), headless);
    if (!file) return failure(tr('missingArgs'), headless);
    const { refusal } = await checkCredentials(user, typeof form.password === 'string' ? form.password : '', clientIp, tr);
    if (refusal !== null) return failure(refusal, headless);

    const stored = await storeLibrary(user, file);
    if (stored === 'invalid') return failure(tr('e_ucJSON'), headless);
    if (stored === 'identical') return text(tr('fiNu'));

    if (headless) return text('Bon appétit!');
    return { status: 302 as const, headers: { location: `/u/${user}` } };
  });

export const uploadShoutRoute = base
  .route({
    method: 'POST',
    path: '/u/{user}/uploadShout',
    tags: ['SoundBuddy'],
    summary: 'Shout what is playing',
    description: `What the user listens to, as ${COMPANION_APP_NAME} sees it : sent live to the visitors of the user's library page.`,
    inputStructure: 'detailed',
    outputStructure: 'detailed',
    spec: operation => ({
      ...operation,
      responses: textResponses({ 200: 'the shout is sent', 500: 'not called by SoundBuddy ("headless")', 520: 'why the shout is refused' }),
    }),
  })
  .input(z.object({ params: userParams, body: uploadForm(SHOUT_UPLOAD_FILE_NAME, 'the shout, as JSON (see the Shout schema)') }))
  .output(z.object({ status: z.literal(200), body: z.file() }))
  .handler(async ({ input, context: { tr, clientIp } }) => {
    const user = input.params.user.toLowerCase();
    const form = input.body;
    const headless = form.headless !== undefined;
    const file = form[SHOUT_UPLOAD_FILE_NAME] as File | undefined;

    if (!userExists(user)) return failure(tr('e_unsu', user), headless);
    if (!headless) throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'expects API call' });
    if (!file) return failure(tr('missingArgs'), true);
    const { refusal } = await checkCredentials(user, typeof form.password === 'string' ? form.password : '', clientIp, tr);
    if (refusal !== null) return failure(refusal, true);

    const json = await uploadedJson(file);
    if (json === undefined) return failure(tr('e_ucJSON'), true);

    storeShout(user, json);

    return text(tr('shouted'));
  });

//
// Library page
//

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

//
// OAuth (RFC 6749), for the application itself : it asks for the password once, which it then forgets
//

// public clients, as an installed application cannot keep a secret
const OAUTH_CLIENTS = [COMPANION_APP_NAME.toLowerCase(), 'api-docs'];

const NO_STORE = { 'cache-control': 'no-store' };

// answered as RFC 6749 tells (server/app.ts)
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

//
// What OAuth opens : errors come as application/problem+json (server/app.ts)
//

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

export const router = {
  checkCredentials: checkCredentialsRoute,
  uploadMusicLibrary: uploadMusicLibraryRoute,
  uploadShout: uploadShoutRoute,
  shouts: shoutsRoute,
  token: tokenRoute,
  revoke: revokeRoute,
  me: meRoute,
  putLibrary: putLibraryRoute,
  postShout: postShoutRoute,
};

// whether a user has uploaded a library yet
export const hasLibrary = (user: string) => existsSync(libraryPath(user));

export const API_TITLE = `${APP_NAME} API`;
