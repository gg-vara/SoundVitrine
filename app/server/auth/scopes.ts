// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What an access token may allow : asked by an application (SoundBuddy, the API's reference), granted by the user on the consent page

import type { TranslationKey } from '../i18n/i18n';

export const SCOPES = {
  'library:write': "replace the user's library",
  'shout:write': 'tell what the user is listening to',
  // a refresh token, to stay connected without asking again
  offline_access: 'stay connected',
} as const;

export type Scope = keyof typeof SCOPES;

export const SCOPE_NAMES = Object.keys(SCOPES) as Scope[];

// how the consent page tells each of them
export const SCOPE_TEXTS: Record<Scope, TranslationKey> = {
  'library:write': 'oauth_scope_library',
  'shout:write': 'oauth_scope_shout',
  offline_access: 'oauth_scope_offline',
};
