// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What a page knows of its visitor : the logged user, from Better Auth's session, and the chosen language, in its own cookie

import type { Lang } from '../i18n/i18n';
import { isLang } from '../i18n/i18n';
import { auth } from './auth';

export interface Session {
  loggedAs?: string;
  lang?: Lang;
}

const LANG_COOKIE = 'soundvitrine_lang';
const LANG_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function chosenLang(request: Request): Lang | undefined {
  for (const part of request.headers.get('cookie')?.split(';') ?? []) {
    const [name, value] = part.trim().split('=');
    if (name === LANG_COOKIE && isLang(value)) return value;
  }
  return undefined;
}

export async function readSession(request: Request): Promise<Session> {
  const session = await auth.api.getSession({ headers: request.headers });
  return { loggedAs: session?.user.username ?? undefined, lang: chosenLang(request) };
}

export const langCookie = (lang: Lang) => `${LANG_COOKIE}=${lang}; Max-Age=${LANG_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax`;
