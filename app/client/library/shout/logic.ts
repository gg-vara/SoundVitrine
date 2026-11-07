// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What a shout means, apart from any page : see tests/shout.test.ts

// any field may miss, or be of another type : a shout comes from what an account uploads
export interface Shout {
  album?: string;
  artist?: string;
  date?: string;
  duration?: number;
  genre?: string;
  md5?: string;
  name?: string;
  playerPositionMS?: number;
  playerState?: boolean;
  year?: number;
}

export const isShout = (value: unknown): value is Shout => typeof value === 'object' && value !== null && !Array.isArray(value);

export function isWorthDisplaying(shout: Shout, millisecondsSince: (date: string) => number): boolean {
  // without a track length or a timestamp, nothing can be said about it
  if (typeof shout.duration !== 'number' || typeof shout.date !== 'string') return false;
  // paused : always meaningful
  if (!shout.playerState) return true;

  // playing : if the track can still be going on
  const remaining = Math.max(shout.duration * 1_000 - (shout.playerPositionMS ?? 0), 0);
  return remaining - millisecondsSince(shout.date) > 0;
}

// sent when nothing plays anymore : only a date
export const isNoMusic = (shout: Shout): boolean => Boolean(shout.date) && Object.keys(shout).length === 1;

export function changedFields(current: Shout, next: Shout): (keyof Shout)[] {
  const fields = new Set([...Object.keys(current), ...Object.keys(next)]) as Set<keyof Shout>;
  return [...fields].filter(field => next[field] !== current[field]);
}

// a new track, rather than the same one going on
export const isNewTrack = (changes: (keyof Shout)[]): boolean =>
  ['artist', 'album', 'name'].some(field => changes.includes(field as keyof Shout));

export const movesTimeline = (changes: (keyof Shout)[]): boolean =>
  ['duration', 'playerPositionMS', 'playerState', 'date'].some(field => changes.includes(field as keyof Shout));

export function metaText(shout: Shout): string {
  const track = shout.artist && shout.album ? `${shout.artist} - ${shout.album}` : '';
  return shout.year ? `${track} (${shout.year})` : track;
}

// since a date given with its time zone, UTC+0 for shouts
export const elapsedSince = (date: string, now: number) => now - Date.parse(date);
