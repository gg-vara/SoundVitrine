// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the account page calls, and the page itself : at /account, mounted by server/app.ts

import { mkdirSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { APIError } from 'better-auth/api';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { auth } from './auth/auth';
import { clearFailures, isBlocked, recordFailure } from './auth/rate-limit';
import { findUser, publicUserFolder, updateProfile, userExists, userFolder } from './auth/users';
import { COMPANION_APP_GITHUB_LATEST_RELEASE_URL, COMPANION_APP_NAME, DEFAULT_BACKGROUND_COLORS } from './config';
import type { AppContext, Env } from './env';
import { plain, setCookies } from './env';
import { accountPage } from './pages/account';
import type { PageContext } from './pages/layout';

const fieldsOf = async (c: AppContext) => (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

const textOf = (value: unknown) => (typeof value === 'string' ? value : '');

const refused = (c: AppContext, error: string, status: ContentfulStatusCode = 400) => c.json({ error }, status);

const accountRules = {
  username: { min: 6, max: 20 },
  password: { min: 8, max: 128 },
};

// what the account page needs to know
function me(context: PageContext) {
  const username = context.session.loggedAs ?? null;
  const user = username ? findUser(username) : undefined;
  return {
    username,
    profilePicture: username && user?.profilePic ? publicUserFolder(username) + user.profilePic : null,
    colors: user?.customColors ?? DEFAULT_BACKGROUND_COLORS,
    rules: accountRules,
    companionApp: { name: COMPANION_APP_NAME, url: COMPANION_APP_GITHUB_LATEST_RELEASE_URL },
  };
}

async function login(c: AppContext): Promise<Response> {
  const { tr, clientIp } = c.var;
  const fields = await fieldsOf(c);
  const username = textOf(fields.username).trim().toLowerCase();
  const password = textOf(fields.password);

  if (!username) return refused(c, tr('e_log_nouser'));
  if (!password) return refused(c, tr('e_log_nopass'));
  if (!findUser(username)) return refused(c, tr('e_unsu', username), 401);
  if (isBlocked(clientIp, username)) return refused(c, tr('e_too_many'), 429);

  try {
    const { headers } = await auth.api.signInUsername({ body: { username, password }, headers: c.req.raw.headers, returnHeaders: true });
    clearFailures(clientIp, username);
    setCookies(c, headers.getSetCookie());
    return c.json({ username });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    recordFailure(clientIp, username);
    return refused(c, tr('e_log_wrongpass'), 401);
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
function accountCreationRefusal(context: PageContext, username: string, password: string): string | null {
  const { tr } = context;

  if (!username) return tr('crea_miss_p_u', tr('username'));
  if (!password) return tr('crea_miss_p_u', tr('password'));
  if (context.session.loggedAs) return tr('err_nocreate_onlog');
  if (userExists(username)) return tr('user_already_exist', username);
  if (!/^[a-zA-Z0-9]+([_-]?[a-zA-Z0-9])*$/.test(username)) return tr('username_invalid', username);

  for (const [field, value] of [
    ['username', username],
    ['password', password],
  ] as const) {
    const { min, max } = accountRules[field];
    if (value.length < min || value.length > max) return tr('field_nc_pattern', tr(field), min, max);
  }

  return null;
}

async function createAccount(c: AppContext): Promise<Response> {
  const { tr } = c.var;
  const fields = await fieldsOf(c);
  const username = textOf(fields.username).trim().toLowerCase();
  const password = textOf(fields.password);

  const refusal = accountCreationRefusal(c.var.page, username, password);
  if (refusal !== null) return refused(c, refusal);

  try {
    const { headers } = await auth.api.signUpEmail({
      body: { name: username, username, displayUsername: username, email: textOf(fields.email), password },
      headers: c.req.raw.headers,
      returnHeaders: true,
    });
    updateProfile(username, { customColors: [randomColor(), randomColor(), randomColor(), randomColor()] });
    mkdirSync(userFolder(username), { recursive: true });
    setCookies(c, headers.getSetCookie());
    return c.json({ username });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    return refused(c, tr('e_email_unusable'));
  }
}

async function savePicture(c: AppContext): Promise<Response> {
  const user = c.var.page.session.loggedAs;
  if (c.req.method !== 'POST' || !user) return plain(c, '');

  const file = (await c.req.formData()).get('file');
  if (!(file instanceof File)) return plain(c, '');

  // images only : these files are served from this origin, where an HTML or SVG one could run scripts
  const extension = extname(file.name).slice(1).toLowerCase();
  if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(extension)) return plain(c, '');

  const pictureName = `pp.${extension}`;
  await Bun.write(join(userFolder(user), pictureName), file);

  const previous = findUser(user)?.profilePic;
  if (previous && previous !== pictureName) rmSync(join(userFolder(user), previous), { force: true });

  updateProfile(user, { profilePic: pictureName });
  return plain(c, publicUserFolder(user) + pictureName);
}

// of the user's band
async function saveColors(c: AppContext): Promise<Response> {
  const user = c.var.page.session.loggedAs;
  const colors: unknown = await c.req.json().catch(() => undefined);
  // checked : they end up in the styles of the pages
  const isColor = (color: unknown) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
  if (!user || !Array.isArray(colors) || colors.length !== 4 || !colors.every(isColor)) return plain(c, '');

  updateProfile(user, { customColors: colors as string[] });
  return plain(c, 'OK');
}

export const accountRoutes = new Hono<Env>();

// an action, whatever follows it in the path
function action(name: string, handler: (c: AppContext) => Response | Promise<Response>) {
  accountRoutes.all(`/${name}`, handler);
  accountRoutes.all(`/${name}/*`, handler);
}

const posted = (c: AppContext) => c.req.method === 'POST';

action('me', c => c.json(me(c.var.page)));
action('login', c => (posted(c) ? login(c) : plain(c, '', 405)));
action('create', c => (posted(c) ? createAccount(c) : c.render(accountPage(c.var.page))));
action('disconnect', async c => {
  if (!posted(c)) return plain(c, '', 405);
  const { headers } = await auth.api.signOut({ headers: c.req.raw.headers, returnHeaders: true });
  setCookies(c, headers.getSetCookie());
  return c.json({});
});
action('picture', savePicture);
action('colors', saveColors);

// the page, whatever else is asked
accountRoutes.all('*', c => c.render(accountPage(c.var.page)));
