// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Configuration and constants

import { resolve } from 'node:path';
import { z } from 'zod';
import packageJson from '../package.json';

export const APP_NAME = 'SoundVitrine';
export const APP_VERSION = packageJson.version;
export const CREATOR_EMAIL = 'guillaume.vara@gmail.com';
export const COMPANION_APP_NAME = 'SoundBuddy';
export const COMPANION_APP_GITHUB_LATEST_RELEASE_URL = 'https://github.com/gg-vara/SoundBuddy/releases/latest';

// the field of the upload form's file
export const MUSIC_LIB_UPLOAD_FILE_NAME = `${APP_NAME}_file`;

// files of a user's folder
export const MUSIC_LIB_PROFILE_FILE_NAME = 'current.json';
export const COMPILED_MUSIC_LIB_PROFILE_FILE_NAME = 'unified.json';
export const SHOUT_PROFILE_FILE_NAME = 'shout.json';

// as these colors can be customized by users
export const DEFAULT_BACKGROUND_COLORS = ['#EE7752', '#E73C7E', '#23A6D5', '#23D5AB'];

// the environment, checked once at startup : a wrong value stops the server with what is wrong, rather than one that seems to
// work. Empty values count as unset, as compose files give them when a variable they use is missing
const environment = z
  .object({
    NODE_ENV: z.string().optional(),
    // state files, on the filesystem : users database, users folders, sessions key. _state in the current folder unless told :
    // nothing is next to the code once compiled
    SOUNDVITRINE_STATE_PATH: z.string().default('_state'),
    PORT: z.coerce.number().int().min(1).max(65535).default(80),
    // where visitors reach SoundVitrine : OAuth's redirections are built from it, and requests from another origin are refused
    // (Better Auth)
    SOUNDVITRINE_PUBLIC_URL: z.url({ protocol: /^https?$/ }).optional(),
    // signs the sessions : else one is generated once, kept in the state folder (server/auth/auth.ts)
    SOUNDVITRINE_SESSION_SECRET: z.string().optional(),
    // the header giving the client's address (to limit password guessing by client), set by what is in front of the server :
    // cf-connecting-ip behind Cloudflare, x-forwarded-for behind a proxy alone. Unset, the direct connection. Only to name when
    // nothing else can reach the server, as anyone could write it
    SOUNDVITRINE_CLIENT_IP_HEADER: z
      .string()
      .regex(/^[A-Za-z0-9-]+$/, 'a header name, like cf-connecting-ip')
      .transform(name => name.toLowerCase())
      .optional(),
    // replaced by SOUNDVITRINE_CLIENT_IP_HEADER : refused rather than ignored, which would quietly count every visitor as the proxy
    SOUNDVITRINE_TRUST_PROXY: z
      .never({ error: 'replaced by SOUNDVITRINE_CLIENT_IP_HEADER (cf-connecting-ip behind Cloudflare)' })
      .optional(),
  })
  .superRefine((values, context) => {
    // in production, the default address (localhost) would make every login and upload from the real one refused
    if (values.NODE_ENV === 'production' && !values.SOUNDVITRINE_PUBLIC_URL) {
      context.addIssue({
        code: 'custom',
        path: ['SOUNDVITRINE_PUBLIC_URL'],
        message: 'required in production : the address visitors use, like https://soundvitrine.example.com',
      });
    }
  });

const parsed = environment.safeParse(
  Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined && value !== '')),
);
if (!parsed.success) {
  console.error(`SoundVitrine cannot start, its environment is wrong :\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}
const env = parsed.data;

export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const STATE_FOLDER_PATH = resolve(env.SOUNDVITRINE_STATE_PATH);
export const PORT = env.PORT;
// without a trailing slash
export const PUBLIC_URL = (env.SOUNDVITRINE_PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/+$/, '');
// visitors come in HTTPS : the proxy in front of the server gives it, which the server cannot see
export const SERVED_IN_HTTPS = PUBLIC_URL.startsWith('https:');
export const SESSION_SECRET = env.SOUNDVITRINE_SESSION_SECRET;
export const CLIENT_IP_HEADER = env.SOUNDVITRINE_CLIENT_IP_HEADER;
