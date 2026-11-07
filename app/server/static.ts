// Files served as they are

import { extname, join, resolve, sep } from 'node:path';
import { SCALAR_SCRIPT } from './api/router';
import { APP_ROOT, STATE_FOLDER_PATH } from './config';
import { latestShout } from './db';
import { text } from './responses';

// "path" within "root", if it is a file there
async function staticFile(root: string, path: string, cacheControl = 'public, max-age=3600'): Promise<Response | undefined> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return undefined;
  }

  const file = resolve(root, `.${sep}${decoded}`);
  if (!file.startsWith(resolve(root) + sep)) return undefined;

  const content = Bun.file(file);
  if (!(await content.exists())) return undefined;
  const length = { 'content-length': String(content.size) };
  return new Response(content, { headers: extname(file) === '.json' ? length : { ...length, 'cache-control': cacheControl } });
}

// the file this request is for, if it is for one
export async function staticRoute(request: Request, path: string): Promise<Response | undefined> {
  if (path === '/api/scalar.js') return new Response(Bun.file(SCALAR_SCRIPT), { headers: { 'content-type': 'text/javascript' } });

  if (request.method === 'GET' && path.startsWith('/public/')) {
    return (await staticFile(join(APP_ROOT, 'client/public'), path.slice('/public/'.length))) ?? text('', 404);
  }
  // Vite's build : a file's name changes with its content, it can be kept forever
  if (request.method === 'GET' && path.startsWith('/web/')) {
    return (
      (await staticFile(join(APP_ROOT, 'client/dist'), path.slice('/web/'.length), 'public, max-age=31536000, immutable')) ?? text('', 404)
    );
  }
  if (request.method === 'GET' && path.startsWith('/data/users/')) {
    // the latest shout comes from the database
    const shoutOf = /^\/data\/users\/([^/]+)\/shout\.json$/.exec(path)?.[1];
    if (shoutOf) {
      const shout = latestShout(shoutOf.toLowerCase());
      return shout ? new Response(shout, { headers: { 'content-type': 'application/json' } }) : text('', 404);
    }

    return (await staticFile(join(STATE_FOLDER_PATH, 'users'), path.slice('/data/users/'.length))) ?? text('', 404);
  }

  return undefined;
}
