// Requests : static files, the API (server/api/router.ts) with its reference, then the pages

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { accountRoute } from './account';
import { apiResponse } from './api/router';
import { prepareAuth } from './auth/auth';
import { chosenLang, langCookie, readSession } from './auth/session';
import { allUsers, ensureUserFolders, userExists } from './auth/users';
import { compressedResponse } from './compressed-response';
import { ALLOW_SSE_TESTING, STATE_FOLDER_PATH, TRUST_PROXY } from './config';
import type { Lang } from './i18n/i18n';
import { defaultLang, isLang, langFromHeader, translator } from './i18n/i18n';
import { hasLibrary } from './library/library';
import { publishShout } from './library/shouts';
import type { PageContext } from './pages/layout';
import { libraryPage } from './pages/library';
import { mockPage } from './pages/mock';
import { uploadPage } from './pages/upload';
import { welcomePage } from './pages/welcome';
import { page, redirect, text } from './responses';
import { staticRoute } from './static';

// the posted fields of a form, as texts
async function formFields(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  if (request.method !== 'POST' || !(type.startsWith('application/x-www-form-urlencoded') || type.startsWith('multipart/form-data'))) {
    return {};
  }

  const fields: Record<string, string> = {};
  for (const [name, value] of await request.clone().formData()) if (typeof value === 'string') fields[name] = value;
  return fields;
}

async function libraryRoute(
  context: PageContext,
  request: Request,
  userPart: string | undefined,
  action: string | undefined,
): Promise<Response> {
  const user = (userPart ?? '').toLowerCase();
  if (!userExists(user)) return text(context.tr('e_unsu', user));

  if (action === 'uploadShout') return text('expects API call', 500);

  // the upload form of a user without library posts its file here
  if (!action && request.method === 'POST' && request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    const upload = new Request(new URL(`/u/${user}/uploadMusicLibrary`, request.url).href, request);
    return (await apiResponse(upload, { tr: context.tr, clientIp: context.clientIp })) ?? text('', 500);
  }

  if (action && action !== 'uploadMusicLibrary') return accountRoute(context, undefined);
  if (!hasLibrary(user) || action === 'uploadMusicLibrary') return page(uploadPage(context));

  return page(libraryPage(context, user));
}

function mockRoute(context: PageContext, action: string | undefined): Response {
  if (!ALLOW_SSE_TESTING) return text('Mock testing is disabled.', 403);
  if (action !== 'send') return page(mockPage(context));
  if (context.request.method !== 'POST') return text('', 404);

  const toUser = context.form.toUser;
  if (!toUser) return text('Missing target user', 400);

  publishShout(toUser, { date: new Date().toISOString(), album: 'The Black Album', artist: 'Metallica' });
  return text('OK');
}

// who calls : "peerAddress" is the direct connection, which is the proxy when there is one
function clientIpOf(request: Request, peerAddress: string | undefined): string {
  const forwarded = TRUST_PROXY ? request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() : undefined;
  return forwarded || peerAddress || 'unknown';
}

export async function handle(request: Request, peerAddress?: string): Promise<Response> {
  return compressedResponse(request, await respond(request, peerAddress));
}

async function respond(request: Request, peerAddress?: string): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/healthz') return text('OK');

  const file = await staticRoute(request, path);
  if (file) return file;

  const clientIp = clientIpOf(request, peerAddress);
  const lang: Lang = chosenLang(request) ?? langFromHeader(request.headers.get('accept-language')) ?? defaultLang;
  const tr = translator(lang);

  const answer = await apiResponse(request, { tr, clientIp });
  if (answer) return answer;

  const context: PageContext = {
    request,
    url,
    session: await readSession(request),
    clientIp,
    lang,
    tr,
    form: await formFields(request),
  };

  // language chosen from the footer : back to the page
  if (isLang(context.form.set_lang)) {
    return page(redirect(path + url.search, 303), [langCookie(context.form.set_lang)]);
  }

  const [section, first, second] = path.split('/').filter(Boolean);
  switch (section) {
    case undefined:
      return page(welcomePage(context, allUsers()));
    case 'account':
      return accountRoute(context, first);
    case 'u':
      return libraryRoute(context, request, first, second);
    case 'mock':
      return first === 'sse' ? mockRoute(context, second) : text('', 404);
    default:
      return text('', 404);
  }
}

// the database, and the folders of the users
export async function prepareState() {
  mkdirSync(join(STATE_FOLDER_PATH, 'users'), { recursive: true });
  await prepareAuth();
  ensureUserFolders();
}
