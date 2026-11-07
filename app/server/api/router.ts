// The API of SoundVitrine, described by an OpenAPI document (served at /api/openapi.json, browsable at /api/docs) :
// what released SoundBuddy versions call (soundbuddy.ts), the live shouts of a user (shouts.ts), and OAuth with what it opens (oauth.ts, v1.ts)

import { join } from 'node:path';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { APP_NAME, APP_ROOT, APP_VERSION, COMPANION_APP_NAME } from '../config';
import type { ApiContext } from './base';
import { revokeRoute, tokenRoute } from './oauth';
import { shoutsRoute } from './shouts';
import { checkCredentialsRoute, uploadMusicLibraryRoute, uploadShoutRoute } from './soundbuddy';
import { meRoute, postShoutRoute, putLibraryRoute, securitySchemes } from './v1';

const router = {
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

const API_TITLE = `${APP_NAME} API`;

export const SCALAR_SCRIPT = join(APP_ROOT, 'node_modules/@scalar/api-reference/dist/browser/standalone.js');

const apiHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsPath: '/api/docs',
      specPath: '/api/openapi.json',
      docsTitle: API_TITLE,
      // Scalar, served from here rather than from a CDN
      docsScriptUrl: '/api/scalar.js',
      specGenerateOptions: {
        info: {
          title: API_TITLE,
          version: APP_VERSION,
          description: `What ${COMPANION_APP_NAME} calls to publish a music library and what is playing, and the live shouts of a user. New clients get tokens from /oauth/token and use /api/v1. The routes taking a password each time are for released ${COMPANION_APP_NAME} versions.`,
        },
        servers: [{ url: '/' }],
        components: { securitySchemes },
      },
    }),
  ],
});

// the API answers in plain text, as SoundBuddy shows these texts to its users : errors too
async function plainTextErrors(response: Response): Promise<Response> {
  if (response.status < 400 || !response.headers.get('content-type')?.startsWith('application/json')) return response;

  const error = (await response.json()) as { message?: string };
  return new Response(error.message ?? '', { status: response.status, headers: { 'content-type': 'text/plain;charset=utf-8' } });
}

// JSON errors, as standards tell them : RFC 6749 on /oauth, RFC 9457 on /api/v1
async function standardErrors(response: Response): Promise<Response> {
  if (response.status < 400 || !response.headers.get('content-type')?.startsWith('application/json')) return response;

  const error = (await response.json()) as { code?: string; message?: string; data?: { error?: string } };
  if (error.code === 'OAUTH') {
    return Response.json(
      { error: error.data?.error, error_description: error.message },
      { status: response.status, headers: { 'cache-control': 'no-store' } },
    );
  }

  const headers = new Headers({ 'content-type': 'application/problem+json' });
  if (response.status === 401) headers.set('www-authenticate', 'Bearer');
  const body = { type: 'about:blank', title: error.code, status: response.status, detail: error.message };
  return new Response(JSON.stringify(body), { status: response.status, headers });
}

// what the API answers to this request, if it is for it
export async function apiResponse(request: Request, context: ApiContext): Promise<Response | undefined> {
  const { matched, response } = await apiHandler.handle(request, { prefix: '/', context });
  if (!matched || !response) return undefined;

  const { pathname } = new URL(request.url);
  return pathname.startsWith('/api/v1/') || pathname.startsWith('/oauth/') ? standardErrors(response) : plainTextErrors(response);
}
