// What the routes of the API share

import { os } from '@orpc/server';
import { z } from 'zod';
import type { Translator } from '../i18n/i18n';

export interface ApiContext {
  tr: Translator;
  clientIp: string;
}

export const base = os.$context<ApiContext>();

export const userParams = z.object({ user: z.string().describe('the username, case insensitive') });
