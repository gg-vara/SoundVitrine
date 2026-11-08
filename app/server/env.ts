// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What Hono's routes share : who calls, in which language, and what the pages are rendered from (server/app.ts)

import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Lang, Translator } from './i18n/i18n';
import type { PageContext } from './pages/layout';

export type Env = {
  // "peerAddress" : the direct connection, which is the proxy when there is one
  Bindings: { peerAddress?: string };
  Variables: { clientIp: string; lang: Lang; tr: Translator; page: PageContext };
};

export type AppContext = Context<Env>;

// "cookies" on the response being built : Better Auth's, the language's
export function setCookies(c: AppContext, cookies: string[]) {
  for (const cookie of cookies) c.header('set-cookie', cookie, { append: true });
}

// plain text, its type said : Bun only adds it when sending, and what repeats a URL must never be read as HTML
export const plain = (c: AppContext, text: string, status: ContentfulStatusCode = 200) =>
  c.text(text, status, { 'content-type': 'text/plain;charset=utf-8' });
