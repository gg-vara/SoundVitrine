// Requests : static files, the API (src/api.ts) with its reference, then the pages

import { mkdirSync, rmSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { APIError } from 'better-auth/api';
import { API_TITLE, hasLibrary, router } from './api';
import { auth, prepareAuth } from './auth';
import { ALLOW_SSE_TESTING, APP_ROOT, APP_VERSION, COMPANION_APP_NAME, STATE_FOLDER_PATH, TRUST_PROXY } from './config';
import { latestShout } from './db';
import type { Html } from './html';
import type { Lang } from './i18n';
import { defaultLang, isLang, langFromHeader, translator } from './i18n';
import { accountPage, accountRules, createAccountPage, uploadPage, welcomePage } from './pages/admin';
import { libraryPage, mockPage } from './pages/explorer';
import type { FormResult, PageContext } from './pages/layout';
import { clearFailures, isBlocked, recordFailure } from './rate-limit';
import { chosenLang, langCookie, readSession } from './session';
import { publishShout } from './shouts';
import { allUsers, ensureUserFolders, findUser, publicUserFolder, updateProfile, userExists, userFolder } from './users';

//
// API
//

const SCALAR_SCRIPT = join(APP_ROOT, 'node_modules/@scalar/api-reference/dist/browser/standalone.js');

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
          description: `What ${COMPANION_APP_NAME} calls to publish a music library and what is playing, and the live shouts of a user.`,
        },
        servers: [{ url: '/' }],
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

//
// Static files
//

// "path" within "root", if it is a file there
async function staticFile(root: string, path: string): Promise<Response | undefined> {
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
  return new Response(content, { headers: extname(file) === '.json' ? {} : { 'cache-control': 'public, max-age=3600' } });
}

//
// Pages
//

const text = (body: string, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/plain;charset=utf-8' } });

const redirect = (location: string, status = 302) => new Response(null, { status, headers: { location } });

// a page, setting "cookies"
function page(content: Html | Response, cookies: string[] = []): Response {
  const response =
    content instanceof Response ? content : new Response(content.value, { headers: { 'content-type': 'text/html;charset=utf-8' } });
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
}

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

// where a user goes once logged in
const afterLogin = (context: PageContext, username: string) => redirect(context.isXhr ? '/account' : `/u/${username}`);

async function login(context: PageContext): Promise<{ cookies?: string[]; result: FormResult | null; response?: Response }> {
  const { tr, clientIp, request } = context;
  const username = (context.form.username ?? '').trim().toLowerCase();
  const password = context.form.password ?? '';
  const refused = (description: string) => ({ result: { isError: true, description } });

  if (context.session.loggedAs === username) return { result: { isError: false, description: tr('e_log_identical') } };
  if (!username) return refused(tr('e_log_nouser'));
  if (!password) return refused(tr('e_nopass'));
  if (!findUser(username)) return refused(tr('e_unsu', username));
  if (isBlocked(clientIp, username)) return refused(tr('e_too_many'));

  try {
    const { headers } = await auth.api.signInUsername({ body: { username, password }, headers: request.headers, returnHeaders: true });
    clearFailures(clientIp, username);
    return { cookies: headers.getSetCookie(), result: null, response: afterLogin(context, username) };
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    recordFailure(clientIp, username);
    return refused(tr('e_pmm'));
  }
}

function randomColor(): string {
  return `#${Array.from({ length: 3 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .toUpperCase()
      .padStart(2, '0'),
  ).join('')}`;
}

// why the account cannot be created, if so
function accountCreationRefusal(context: PageContext): string | null {
  const { tr, form } = context;
  const username = (form.username ?? '').trim().toLowerCase();

  for (const field of ['username', 'password'] as const) {
    if (!form[field]) return tr('crea_miss_p_u', tr(field));
  }
  if (context.session.loggedAs) return tr('err_nocreate_onlog');
  if (userExists(username)) return tr('user_already_exist', username);
  if (!/^[a-zA-Z0-9]+([_-]?[a-zA-Z0-9])*$/.test(username)) return tr('username_invalid', username);

  for (const field of ['username', 'password'] as const) {
    const { min, max } = accountRules[field];
    const length = (field === 'username' ? username : (form[field] ?? '')).length;
    if (length < min || length > max) return tr('field_nc_pattern', tr(field), min, max);
  }

  return null;
}

async function accountRoute(context: PageContext, action: string | undefined): Promise<Response> {
  const { request, session } = context;

  switch (action) {
    case 'create': {
      if (request.method !== 'POST') return page(createAccountPage(context, null));

      const refusal = accountCreationRefusal(context);
      if (refusal !== null) return page(createAccountPage(context, { isError: true, description: refusal }));

      const username = (context.form.username ?? '').trim().toLowerCase();
      try {
        const { headers } = await auth.api.signUpEmail({
          body: {
            name: username,
            username,
            displayUsername: username,
            email: context.form.email ?? '',
            password: context.form.password ?? '',
          },
          headers: request.headers,
          returnHeaders: true,
        });
        updateProfile(username, { customColors: [randomColor(), randomColor(), randomColor(), randomColor()] });
        mkdirSync(userFolder(username), { recursive: true });
        return page(afterLogin(context, username), headers.getSetCookie());
      } catch (error) {
        if (!(error instanceof APIError)) throw error;
        return page(createAccountPage(context, { isError: true, description: context.tr('e_email_unusable') }));
      }
    }

    case 'disconnect': {
      const referer = request.headers.get('referer');
      const { headers } = await auth.api.signOut({ headers: request.headers, returnHeaders: true });
      return page(redirect(context.isXhr ? '/account' : (referer ?? '/')), headers.getSetCookie());
    }

    // profile picture
    case 'pp': {
      const user = session.loggedAs;
      if (request.method !== 'POST' || !user) return text('');

      const file = (await request.formData()).get('file');
      if (!(file instanceof File)) return text('');

      // images only : these files are served from this origin, where an HTML or SVG one could run scripts
      const extension = extname(file.name).slice(1).toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(extension)) return text('');

      const pictureName = `pp.${extension}`;
      await Bun.write(join(userFolder(user), pictureName), file);

      const previous = findUser(user)?.profilePic;
      if (previous && previous !== pictureName) rmSync(join(userFolder(user), previous), { force: true });

      updateProfile(user, { profilePic: pictureName });
      return text(publicUserFolder(user) + pictureName);
    }

    // colors of the user's band
    case 'bb': {
      const user = session.loggedAs;
      const colors: unknown = await request.json().catch(() => undefined);
      // checked : they end up in the styles of the pages
      const isColor = (color: unknown) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
      if (!user || !Array.isArray(colors) || colors.length !== 4 || !colors.every(isColor)) return text('');

      updateProfile(user, { customColors: colors as string[] });
      return text('OK');
    }

    default: {
      if (request.method === 'POST' && (context.form.username !== undefined || context.form.password !== undefined)) {
        const loggedIn = await login(context);
        return page(loggedIn.response ?? accountPage(context, loggedIn.result), loggedIn.cookies);
      }
      return page(accountPage(context, null));
    }
  }
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
    const { response } = await apiHandler.handle(upload, { prefix: '/', context: { tr: context.tr, clientIp: context.clientIp } });
    return response ? plainTextErrors(response) : text('', 500);
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

//
// Requests
//

// who calls : "peerAddress" is the direct connection, which is the proxy when there is one
function clientIpOf(request: Request, peerAddress: string | undefined): string {
  const forwarded = TRUST_PROXY ? request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() : undefined;
  return forwarded || peerAddress || 'unknown';
}

export async function handle(request: Request, peerAddress?: string): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/healthz') return text('OK');
  if (path === '/api/scalar.js') return new Response(Bun.file(SCALAR_SCRIPT), { headers: { 'content-type': 'text/javascript' } });

  if (request.method === 'GET' && path.startsWith('/public/')) {
    return (await staticFile(join(APP_ROOT, 'public'), path.slice('/public/'.length))) ?? text('', 404);
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

  const clientIp = clientIpOf(request, peerAddress);
  const lang: Lang = chosenLang(request) ?? langFromHeader(request.headers.get('accept-language')) ?? defaultLang;
  const tr = translator(lang);

  const { matched, response } = await apiHandler.handle(request, { prefix: '/', context: { tr, clientIp } });
  if (matched && response) return plainTextErrors(response);

  const context: PageContext = {
    request,
    url,
    session: await readSession(request),
    clientIp,
    lang,
    tr,
    isXhr: request.headers.get('x-requested-with')?.toLowerCase() === 'xmlhttprequest',
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
