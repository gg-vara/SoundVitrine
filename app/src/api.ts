// The API of SoundVitrine, described by an OpenAPI document (served at /api/openapi.json, browsable at /api/docs) :
// what SoundBuddy calls, as it always did (multipart forms in, plain text out), and the live shouts of a user

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { eventIterator, ORPCError, os } from '@orpc/server';
import { z } from 'zod';
import { decompressUpload } from './compression';
import {
  APP_NAME,
  COMPANION_APP_NAME,
  COMPRESSED_LIBRARY_CONTENT_TYPE,
  LEGACY_COMPRESSED_LIBRARY_CONTENT_TYPE,
  MUSIC_LIB_UPLOAD_FILE_NAME,
  SHOUT_PROFILE_FILE_NAME,
  SHOUT_UPLOAD_FILE_NAME,
} from './config';
import { librarySha1, saveLatestShout, saveLibraryRecord } from './db';
import type { Translator } from './i18n';
import { compileLibrary, libraryPath } from './library';
import { publishShout, ShoutSchema, shoutsOf } from './shouts';
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
      `(MSZIP buffer of Windows' Compression API, zlib, gzip or raw deflate). ${COMPANION_APP_NAME} sends those as "${COMPRESSED_LIBRARY_CONTENT_TYPE}", its older versions as "${LEGACY_COMPRESSED_LIBRARY_CONTENT_TYPE}".`,
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

    const json = await uploadedJson(file);
    if (json === undefined) return failure(tr('e_ucJSON'), headless);

    // identical to the current library
    const sha1 = createHash('sha1').update(json).digest('hex');
    if (sha1 === librarySha1(user)) return text(tr('fiNu'));

    await Bun.write(libraryPath(user), json);
    await compileLibrary(user);
    saveLibraryRecord(user, sha1);

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

    // sent live only if it is one, but kept anyway
    const shout = ShoutSchema.safeParse(JSON.parse(json));
    if (shout.success) publishShout(user, shout.data);
    saveLatestShout(user, json);

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

export const router = {
  checkCredentials: checkCredentialsRoute,
  uploadMusicLibrary: uploadMusicLibraryRoute,
  uploadShout: uploadShoutRoute,
  shouts: shoutsRoute,
};

// whether a user has uploaded a library yet
export const hasLibrary = (user: string) => existsSync(libraryPath(user));

export const API_TITLE = `${APP_NAME} API`;
