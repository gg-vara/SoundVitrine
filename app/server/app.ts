// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Requests, on Hono : static files, the API (server/api/router.ts) with its reference, then the pages

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Hono } from 'hono';
import { accountRoute } from './account';
import { apiResponse } from './api/router';
import { prepareAuth } from './auth/auth';
import { chosenLang, langCookie, readSession } from './auth/session';
import { allUsers, ensureUserFolders, userExists } from './auth/users';
import { compressedResponse } from './compressed-response';
import { ALLOW_SSE_TESTING, STATE_FOLDER_PATH, TRUST_PROXY } from './config';
import type { Lang, Translator } from './i18n/i18n';
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

// the path's parts after its first one : /u/curator/uploadShout gives curator, uploadShout
function partsOf(path: string): (string | undefined)[] {
  return path.split('/').filter(Boolean).slice(1);
}

type Env = {
  Bindings: { peerAddress?: string };
  Variables: { clientIp: string; lang: Lang; tr: Translator; page: PageContext };
};

const app = new Hono<Env>();

// for browsers that ask, except what must stay as it is (server/compressed-response.ts)
app.use(async (c, next) => {
  await next();
  c.res = compressedResponse(c.req.raw, c.res);
});

app.all('/healthz', () => text('OK'));

app.use(async (c, next) => (await staticRoute(c.req.raw, c.req.path)) ?? next());

// who calls, in which language : the API answers in it too
app.use(async (c, next) => {
  const lang: Lang = chosenLang(c.req.raw) ?? langFromHeader(c.req.header('accept-language') ?? null) ?? defaultLang;
  c.set('clientIp', clientIpOf(c.req.raw, c.env?.peerAddress));
  c.set('lang', lang);
  c.set('tr', translator(lang));
  await next();
});

// the API, with its reference : first, as it reads the body itself
app.use(async (c, next) => (await apiResponse(c.req.raw, { tr: c.var.tr, clientIp: c.var.clientIp })) ?? next());

// what the pages are rendered from
app.use(async (c, next) => {
  const request = c.req.raw;
  const context: PageContext = {
    request,
    url: new URL(request.url),
    session: await readSession(request),
    clientIp: c.var.clientIp,
    lang: c.var.lang,
    tr: c.var.tr,
    form: await formFields(request),
  };

  // language chosen from the footer : back to the page
  if (isLang(context.form.set_lang)) {
    return page(redirect(context.url.pathname + context.url.search, 303), [langCookie(context.form.set_lang)]);
  }

  c.set('page', context);
  return next();
});

app.all('/', c => page(welcomePage(c.var.page, allUsers())));

for (const path of ['/account', '/account/*']) {
  app.all(path, c => accountRoute(c.var.page, partsOf(c.req.path)[0]));
}

for (const path of ['/u', '/u/*']) {
  app.all(path, c => {
    const [user, action] = partsOf(c.req.path);
    return libraryRoute(c.var.page, c.req.raw, user, action);
  });
}

app.all('/mock/sse/*', c => mockRoute(c.var.page, partsOf(c.req.path)[1]));
app.all('/mock/sse', c => mockRoute(c.var.page, undefined));

app.notFound(() => text('', 404));

export function handle(request: Request, peerAddress?: string): Promise<Response> {
  return Promise.resolve(app.fetch(request, { peerAddress }));
}

// the database, and the folders of the users
export async function prepareState() {
  mkdirSync(join(STATE_FOLDER_PATH, 'users'), { recursive: true });
  await prepareAuth();
  ensureUserFolders();
}
