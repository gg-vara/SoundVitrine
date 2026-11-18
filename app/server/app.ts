// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Requests, on Hono : static files, the API (server/api/router.ts) with its reference, then the pages

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Hono } from 'hono';
import { accountRoutes } from './account';
import { apiResponse } from './api/router';
import { storeLibrary } from './api/uploads';
import { auth, prepareAuth } from './auth/auth';
import { chosenLang, langCookie, readSession } from './auth/session';
import { allUsers, ensureUserFolders, userExists } from './auth/users';
import { compressedResponse } from './compressed-response';
import { MUSIC_LIB_UPLOAD_FILE_NAME, PUBLIC_URL, STATE_FOLDER_PATH, TRUST_PROXY } from './config';
import type { AppContext, Env } from './env';
import { plain, setCookies } from './env';
import type { Lang } from './i18n/i18n';
import { defaultLang, isLang, langFromHeader, translator } from './i18n/i18n';
import { hasLibrary } from './library/library';
import { oauthRoutes } from './oauth';
import { accountPage } from './pages/account';
import type { PageContext } from './pages/layout';
import { renderPages } from './pages/layout';
import { libraryPage } from './pages/library';
import { uploadPage } from './pages/upload';
import { welcomePage } from './pages/welcome';
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

// a library from the upload form : only by its owner, logged in, from one of our pages (the session cookie alone would let
// another site post here)
async function uploadRoute(c: AppContext, user: string): Promise<Response> {
  const context = c.var.page;
  if (context.session.loggedAs !== user || c.req.header('origin') !== new URL(PUBLIC_URL).origin) return plain(c, '', 403);

  const file = (await c.req.raw.formData()).get(MUSIC_LIB_UPLOAD_FILE_NAME);
  const stored = file instanceof File ? await storeLibrary(user, file) : 'invalid';
  if (stored === 'invalid') {
    c.status(400);
    return c.render(uploadPage(context, user, context.tr(file instanceof File ? 'e_ucJSON' : 'missingArgs')));
  }
  return c.redirect(`/u/${user}`, 303);
}

async function libraryRoute(c: AppContext, userPart: string | undefined, action: string | undefined): Promise<Response> {
  const context = c.var.page;
  const user = (userPart ?? '').toLowerCase();
  if (!userExists(user)) return plain(c, context.tr('e_unsu', user));

  // the upload form of a user without library posts its file here
  if (!action && c.req.method === 'POST' && c.req.header('content-type')?.startsWith('multipart/form-data')) return uploadRoute(c, user);

  if (action && action !== 'uploadMusicLibrary') return c.render(accountPage(context));
  if (!hasLibrary(user) || action === 'uploadMusicLibrary') return c.render(uploadPage(context, user));

  return c.render(libraryPage(context, user));
}

// who calls : "peerAddress" is the direct connection, which is the proxy when there is one
function clientIpOf(request: Request, peerAddress: string | undefined): string {
  const forwarded = TRUST_PROXY ? request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() : undefined;
  return forwarded || peerAddress || 'unknown';
}

// the path's parts after its first one : /u/curator/uploadMusicLibrary gives curator, uploadMusicLibrary
function partsOf(path: string): (string | undefined)[] {
  return path.split('/').filter(Boolean).slice(1);
}

const app = new Hono<Env>();

// for browsers that ask, except what must stay as it is (server/compressed-response.ts)
app.use(async (c, next) => {
  await next();
  c.res = compressedResponse(c.req.raw, c.res);
});

app.all('/healthz', c => plain(c, 'OK'));

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

// OAuth's endpoints, by Better Auth : the only routes of its own exposed (server/auth/auth.ts)
app.on(['GET', 'POST'], '/api/auth/oauth2/*', c => auth.handler(c.req.raw));

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
    setCookies(c, [langCookie(context.form.set_lang)]);
    return c.redirect(context.url.pathname + context.url.search, 303);
  }

  c.set('page', context);
  return next();
});

app.use(renderPages);

app.all('/', c => c.render(welcomePage(c.var.page, allUsers())));

app.route('/account', accountRoutes);
app.route('/oauth', oauthRoutes);

for (const path of ['/u', '/u/*']) {
  app.all(path, c => {
    const [user, action] = partsOf(c.req.path);
    return libraryRoute(c, user, action);
  });
}

app.notFound(c => plain(c, '', 404));

export function handle(request: Request, peerAddress?: string): Promise<Response> {
  return Promise.resolve(app.fetch(request, { peerAddress }));
}

// the database, and the folders of the users
export async function prepareState() {
  mkdirSync(join(STATE_FOLDER_PATH, 'users'), { recursive: true });
  await prepareAuth();
  ensureUserFolders();
}
