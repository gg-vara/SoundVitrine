// What the account page calls, and the page itself

import { mkdirSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { APIError } from 'better-auth/api';
import { auth } from './auth/auth';
import { clearFailures, isBlocked, recordFailure } from './auth/rate-limit';
import { findUser, publicUserFolder, updateProfile, userExists, userFolder } from './auth/users';
import { COMPANION_APP_GITHUB_LATEST_RELEASE_URL, COMPANION_APP_NAME, DEFAULT_BACKGROUND_COLORS } from './config';
import { accountPage } from './pages/account';
import type { PageContext } from './pages/layout';
import { json, page, refused, text } from './responses';

const fieldsOf = async (request: Request) => (await request.json().catch(() => ({}))) as Record<string, unknown>;

const textOf = (value: unknown) => (typeof value === 'string' ? value : '');

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

async function login(context: PageContext): Promise<Response> {
  const { tr, clientIp, request } = context;
  const fields = await fieldsOf(request);
  const username = textOf(fields.username).trim().toLowerCase();
  const password = textOf(fields.password);

  if (!username) return refused(tr('e_log_nouser'));
  if (!password) return refused(tr('e_log_nopass'));
  if (!findUser(username)) return refused(tr('e_unsu', username), 401);
  if (isBlocked(clientIp, username)) return refused(tr('e_too_many'), 429);

  try {
    const { headers } = await auth.api.signInUsername({ body: { username, password }, headers: request.headers, returnHeaders: true });
    clearFailures(clientIp, username);
    return json({ username }, 200, headers.getSetCookie());
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    recordFailure(clientIp, username);
    return refused(tr('e_log_wrongpass'), 401);
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

async function createAccount(context: PageContext): Promise<Response> {
  const { request, tr } = context;
  const fields = await fieldsOf(request);
  const username = textOf(fields.username).trim().toLowerCase();
  const password = textOf(fields.password);

  const refusal = accountCreationRefusal(context, username, password);
  if (refusal !== null) return refused(refusal);

  try {
    const { headers } = await auth.api.signUpEmail({
      body: { name: username, username, displayUsername: username, email: textOf(fields.email), password },
      headers: request.headers,
      returnHeaders: true,
    });
    updateProfile(username, { customColors: [randomColor(), randomColor(), randomColor(), randomColor()] });
    mkdirSync(userFolder(username), { recursive: true });
    return json({ username }, 200, headers.getSetCookie());
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    return refused(tr('e_email_unusable'));
  }
}

export async function accountRoute(context: PageContext, action: string | undefined): Promise<Response> {
  const { request, session } = context;
  const posted = request.method === 'POST';

  switch (action) {
    case 'me':
      return json(me(context));

    case 'login':
      return posted ? login(context) : text('', 405);

    case 'create':
      return posted ? createAccount(context) : page(accountPage(context));

    case 'disconnect': {
      if (!posted) return text('', 405);
      const { headers } = await auth.api.signOut({ headers: request.headers, returnHeaders: true });
      return json({}, 200, headers.getSetCookie());
    }

    case 'picture': {
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

    // of the user's band
    case 'colors': {
      const user = session.loggedAs;
      const colors: unknown = await request.json().catch(() => undefined);
      // checked : they end up in the styles of the pages
      const isColor = (color: unknown) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
      if (!user || !Array.isArray(colors) || colors.length !== 4 || !colors.every(isColor)) return text('');

      updateProfile(user, { customColors: colors as string[] });
      return text('OK');
    }

    default:
      return page(accountPage(context));
  }
}
