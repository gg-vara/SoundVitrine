// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The API of SoundVitrine, described by an OpenAPI document (served at /api/openapi.json, browsable at /api/docs) :
// the live shouts of a user (shouts.ts), and what applications logged in through the browser call (v1.ts)

import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { APP_NAME, APP_VERSION, COMPANION_APP_NAME } from '../config';
import type { ApiContext } from './base';
import { shoutsRoute } from './shouts';
import { meRoute, postShoutRoute, putLibraryRoute, securitySchemes } from './v1';

const router = {
  shouts: shoutsRoute,
  me: meRoute,
  putLibrary: putLibraryRoute,
  postShout: postShoutRoute,
};

const API_TITLE = `${APP_NAME} API`;

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
          description: `What ${COMPANION_APP_NAME} calls to publish a music library and what is playing, and the live shouts of a user. Applications log in through the browser (OAuth's authorization code, with PKCE) and call /api/v1.`,
        },
        servers: [{ url: '/' }],
        components: { securitySchemes },
      },
    }),
  ],
});

// JSON errors, as RFC 9457 tells them
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

  return standardErrors(response);
}
