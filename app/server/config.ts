// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Configuration and constants

import { resolve } from 'node:path';
import packageJson from '../package.json';

export const APP_NAME = 'SoundVitrine';
export const APP_VERSION = packageJson.version;
export const CREATOR_EMAIL = 'guillaume.vara@gmail.com';
export const COMPANION_APP_NAME = 'SoundBuddy';
export const COMPANION_APP_GITHUB_LATEST_RELEASE_URL = 'https://github.com/gg-vara/SoundBuddy/releases/latest';

// multipart field names of the files the companion app uploads
export const MUSIC_LIB_UPLOAD_FILE_NAME = `${APP_NAME}_file`;
export const SHOUT_UPLOAD_FILE_NAME = 'shout_file';

// content type SoundBuddy gives a compressed library upload : informative, as uploads are told from their content
export const COMPRESSED_LIBRARY_CONTENT_TYPE = 'application/octet-stream';

// files of a user's folder
export const MUSIC_LIB_PROFILE_FILE_NAME = 'current.json';
export const COMPILED_MUSIC_LIB_PROFILE_FILE_NAME = 'unified.json';
export const SHOUT_PROFILE_FILE_NAME = 'shout.json';

// as these colors can be customized by users
export const DEFAULT_BACKGROUND_COLORS = ['#EE7752', '#E73C7E', '#23A6D5', '#23D5AB'];

// state files, on the filesystem : users database, users folders, sessions key
// _state in the current folder unless told : nothing is next to the code once compiled
export const STATE_FOLDER_PATH = resolve(process.env.SOUNDVITRINE_STATE_PATH ?? '_state');

export const PORT = Number(process.env.PORT ?? 80);

// behind a proxy, which appends the client's address to X-Forwarded-For (to limit password guessing by client)
export const TRUST_PROXY = process.env.SOUNDVITRINE_TRUST_PROXY === '1';

// served in HTTP rather than HTTPS : canonical URLs when no proxy tells the scheme (X-Forwarded-Proto), and session cookies
export const ENFORCE_CANONICAL_HTTP_SCHEME = process.env.ENFORCE_CANONICAL_HTTP_SCHEME === '1';
