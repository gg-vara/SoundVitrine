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
const flag = z
  .enum(['0', '1'])
  .optional()
  .transform(value => value === '1');
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
    // behind a proxy, which appends the client's address to X-Forwarded-For (to limit password guessing by client)
    SOUNDVITRINE_TRUST_PROXY: flag,
    // served in HTTP rather than HTTPS : canonical URLs when no proxy tells the scheme (X-Forwarded-Proto), and session cookies
    ENFORCE_CANONICAL_HTTP_SCHEME: flag,
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
export const SESSION_SECRET = env.SOUNDVITRINE_SESSION_SECRET;
export const TRUST_PROXY = env.SOUNDVITRINE_TRUST_PROXY;
export const ENFORCE_CANONICAL_HTTP_SCHEME = env.ENFORCE_CANONICAL_HTTP_SCHEME;
