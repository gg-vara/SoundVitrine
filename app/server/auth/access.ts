// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Who an access token is for, and what it allows : a JWT Better Auth signed for /api/v1, verified here with its public keys, without
// asking anyone. Its audience must be the API, and it must not have expired

import { createLocalJWKSet, jwtVerify } from 'jose';
import { PUBLIC_URL } from '../config';
import { API_RESOURCE, auth } from './auth';
import type { Scope } from './scopes';
import { usernameOfId } from './users';

export interface Access {
  username: string;
  scopes: Scope[];
}

// from an Authorization header : null without a token, or for one this server did not sign for the API, or which has expired
export async function accessOf(authorization: string | undefined): Promise<Access | null> {
  const token = /^Bearer (\S+)$/i.exec(authorization ?? '')?.[1];
  if (!token) return null;

  // read again each time : the keys may have been rotated
  const keys = createLocalJWKSet((await auth.api.getJwks()) as Parameters<typeof createLocalJWKSet>[0]);
  const verified = await jwtVerify(token, keys, { issuer: `${PUBLIC_URL}/api/auth`, audience: API_RESOURCE }).catch(() => null);
  const { sub, scope } = verified?.payload ?? {};
  if (typeof sub !== 'string') return null;

  const username = usernameOfId(sub);
  if (!username) return null;
  return { username, scopes: (typeof scope === 'string' ? scope : '').split(' ').filter(Boolean) as Scope[] };
}
