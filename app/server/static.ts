// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Files served as they are

import { join, resolve, sep } from 'node:path';
import { STATE_FOLDER_PATH } from './config';
import { latestShout } from './db';
import { embedded } from './embedded';

// as the routes answer what they do not know
const notFound = () => new Response('', { status: 404, headers: { 'content-type': 'text/plain;charset=utf-8' } });

function fileResponse(file: string, headers: Record<string, string> = {}): Response {
  const content = Bun.file(file);
  return new Response(content, { headers: { 'content-length': String(content.size), ...headers } });
}

// one of the application's files, by its URL : only those listed exist (server/embedded.ts). Vite's build names a file by its
// content, so it can be kept forever
function applicationFile(path: string): Response | undefined {
  const file = embedded[path.slice(1)];
  if (!file) return undefined;
  return fileResponse(file, { 'cache-control': path.startsWith('/web/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600' });
}

// what users uploaded, on disk : the latest shout is in the database, and a library changes with each upload, so it is not cached
async function userFile(path: string): Promise<Response | undefined> {
  const shoutOf = /^\/data\/users\/([^/]+)\/shout\.json$/.exec(path)?.[1];
  if (shoutOf) {
    const shout = latestShout(shoutOf.toLowerCase());
    return shout ? new Response(shout, { headers: { 'content-type': 'application/json' } }) : undefined;
  }

  let name: string;
  try {
    name = decodeURIComponent(path.slice('/data/users/'.length));
  } catch {
    return undefined;
  }
  const root = resolve(join(STATE_FOLDER_PATH, 'users'));
  const file = resolve(root, `.${sep}${name}`);
  if (!file.startsWith(root + sep) || !(await Bun.file(file).exists())) return undefined;
  return fileResponse(file, file.endsWith('.json') ? {} : { 'cache-control': 'public, max-age=3600' });
}

// the file this request is for, if it is for one
export async function staticRoute(request: Request, path: string): Promise<Response | undefined> {
  if (path === '/api/scalar.js') return applicationFile(path);
  if (request.method !== 'GET') return undefined;

  if (path.startsWith('/public/') || path.startsWith('/web/')) return applicationFile(path) ?? notFound();
  if (path.startsWith('/data/users/')) return (await userFile(path)) ?? notFound();
  return undefined;
}
