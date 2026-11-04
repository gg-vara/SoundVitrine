// Browser sessions : the logged user and chosen language, in a cookie signed with a key of the state folder

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_FOLDER_PATH } from './config';
import type { Lang } from './i18n';
import { isLang } from './i18n';

export interface Session {
  loggedAs?: string;
  lang?: Lang;
}

const COOKIE_NAME = 'soundvitrine_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// the signing key : SOUNDVITRINE_SESSION_SECRET, else one generated once, kept in the state folder
function loadSecret(): Buffer {
  if (process.env.SOUNDVITRINE_SESSION_SECRET) return Buffer.from(process.env.SOUNDVITRINE_SESSION_SECRET);

  const path = join(STATE_FOLDER_PATH, 'session.key');
  if (!existsSync(path)) {
    mkdirSync(STATE_FOLDER_PATH, { recursive: true });
    writeFileSync(path, randomBytes(32).toString('base64'), { mode: 0o600 });
  }
  return Buffer.from(readFileSync(path, 'utf8').trim());
}

let secret: Buffer | undefined;

function sign(payload: string): string {
  secret ??= loadSecret();
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function cookieValue(request: Request): string | undefined {
  for (const part of request.headers.get('cookie')?.split(';') ?? []) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME) return value.join('=');
  }
  return undefined;
}

export function readSession(request: Request): Session {
  const [payload, signature] = cookieValue(request)?.split('.') ?? [];
  if (!payload || !signature) return {};

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return {};

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
    return {
      loggedAs: typeof data.loggedAs === 'string' && data.loggedAs ? data.loggedAs : undefined,
      lang: isLang(data.lang) ? data.lang : undefined,
    };
  } catch {
    return {};
  }
}

// Set-Cookie header storing "session", or clearing it when empty
export function sessionCookie(session: Session, secure: boolean): string {
  const attributes = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  if (!session.loggedAs && !session.lang) return `${COOKIE_NAME}=; Max-Age=0; ${attributes}`;

  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${COOKIE_NAME}=${payload}.${sign(payload)}; Max-Age=${MAX_AGE_SECONDS}; ${attributes}`;
}
