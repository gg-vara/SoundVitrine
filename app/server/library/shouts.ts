// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Live shouts : what a user listens to, published as SoundBuddy uploads it, to the visitors of the user's library page

import { z } from 'zod';

export const ShoutSchema = z
  .looseObject({
    date: z.string().describe('when, in UTC (ISO 8601)'),
    name: z.string().optional(),
    album: z.string().optional(),
    artist: z.string().optional(),
    genre: z.string().optional(),
    duration: z.number().optional().describe('seconds'),
    playerPositionMS: z.number().optional(),
    playerState: z.boolean().optional().describe('playing'),
    year: z.number().optional(),
    md5: z.string().optional().describe('of the audio file'),
  })
  .describe('what the music app plays : only "date" when nothing is playing')
  .meta({ id: 'Shout' });

export type Shout = z.infer<typeof ShoutSchema>;

type Listener = (shout: Shout) => void;

const listeners = new Map<string, Set<Listener>>();

export function publishShout(username: string, shout: Shout) {
  for (const listener of listeners.get(username) ?? []) listener(shout);
}

// the shouts of "username" from now on, until "signal" aborts
export async function* shoutsOf(username: string, signal?: AbortSignal): AsyncGenerator<Shout> {
  const pending: Shout[] = [];
  let wake: (() => void) | undefined;

  const listener: Listener = shout => {
    pending.push(shout);
    wake?.();
  };
  const onAbort = () => wake?.();

  let userListeners = listeners.get(username);
  if (!userListeners) {
    userListeners = new Set();
    listeners.set(username, userListeners);
  }
  userListeners.add(listener);
  signal?.addEventListener('abort', onAbort);

  try {
    while (!signal?.aborted) {
      const shout = pending.shift();
      if (shout) {
        yield shout;
      } else {
        await new Promise<void>(resolve => {
          wake = resolve;
        });
        wake = undefined;
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    userListeners.delete(listener);
    if (userListeners.size === 0) listeners.delete(username);
  }
}
