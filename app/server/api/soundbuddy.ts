// What released SoundBuddy versions call : multipart forms in, plain text out, the password each time

import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import { checkCredentials, userExists } from '../auth/users';
import { COMPANION_APP_NAME, COMPRESSED_LIBRARY_CONTENT_TYPE, MUSIC_LIB_UPLOAD_FILE_NAME, SHOUT_UPLOAD_FILE_NAME } from '../config';
import { base, userParams } from './base';
import { storeLibrary, storeShout, uploadedJson } from './uploads';

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

const uploadForm = (fileField: string, fileDescription: string) =>
  z.object({
    password: z.string().optional().describe("the user's password"),
    headless: z.string().optional().describe('set by SoundBuddy : errors then come with HTTP status 520'),
    [fileField]: z.file().optional().describe(fileDescription),
  });

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
