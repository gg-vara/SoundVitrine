// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Files served as they are

import { extname, join, resolve, sep } from 'node:path';
import { STATE_FOLDER_PATH } from './config';
import { latestShout } from './db';
import { embedded } from './embedded';
import { text } from './responses';

function decoded(path: string): string | undefined {
  try {
    return decodeURIComponent(path);
  } catch {
    return undefined;
  }
}

function fileResponse(file: string, cacheControl: string): Response {
  const content = Bun.file(file);
  const length = { 'content-length': String(content.size) };
  return new Response(content, { headers: extname(file) === '.json' ? length : { ...length, 'cache-control': cacheControl } });
}

// one of the application's files, by its path in server/embedded.ts : nothing else exists there
function applicationFile(path: string | undefined, cacheControl = 'public, max-age=3600'): Response | undefined {
  const file = path === undefined ? undefined : embedded[path];
  return file ? fileResponse(file, cacheControl) : undefined;
}

// "path" within "root" on disk, if it is a file there : what users uploaded
async function stateFile(root: string, path: string): Promise<Response | undefined> {
  const name = decoded(path);
  if (name === undefined) return undefined;

  const file = resolve(root, `.${sep}${name}`);
  if (!file.startsWith(resolve(root) + sep) || !(await Bun.file(file).exists())) return undefined;
  return fileResponse(file, 'public, max-age=3600');
}

// the file this request is for, if it is for one
export async function staticRoute(request: Request, path: string): Promise<Response | undefined> {
  if (path === '/api/scalar.js')
    return new Response(Bun.file(embedded['scalar.js'] as string), { headers: { 'content-type': 'text/javascript' } });

  if (request.method === 'GET' && path.startsWith('/public/')) {
    return applicationFile(decoded(path.slice(1))) ?? text('', 404);
  }
  // Vite's build : a file's name changes with its content, it can be kept forever
  if (request.method === 'GET' && path.startsWith('/web/')) {
    return applicationFile(decoded(path.slice(1)), 'public, max-age=31536000, immutable') ?? text('', 404);
  }
  if (request.method === 'GET' && path.startsWith('/data/users/')) {
    // the latest shout comes from the database
    const shoutOf = /^\/data\/users\/([^/]+)\/shout\.json$/.exec(path)?.[1];
    if (shoutOf) {
      const shout = latestShout(shoutOf.toLowerCase());
      return shout ? new Response(shout, { headers: { 'content-type': 'application/json' } }) : text('', 404);
    }

    return (await stateFile(join(STATE_FOLDER_PATH, 'users'), path.slice('/data/users/'.length))) ?? text('', 404);
  }

  return undefined;
}
