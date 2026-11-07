// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What a table of the feed shows, and in which order, apart from any page : see tests/feed.test.ts
import type { FeedAlbum } from '../data/data';

export const FEED_COLUMNS = ['Year', 'Genre', 'Artist', 'Album'] as const;
export type FeedColumn = (typeof FEED_COLUMNS)[number];

export interface FeedSort {
  column: FeedColumn;
  reversed: boolean;
}

// whatever the case or accents, and "Album 9" before "Album 10"
const ORDER = new Intl.Collator(undefined, { numeric: true });

export const cellText = (album: FeedAlbum, column: FeedColumn): string => String(album[column] ?? '');

// sorting by a column, then reversing it at the next click
export const nextSort = (current: FeedSort | null, column: FeedColumn): FeedSort => ({
  column,
  reversed: current?.column === column && !current.reversed,
});

export function sortedAlbums(albums: FeedAlbum[], sort: FeedSort | null): FeedAlbum[] {
  if (!sort) return albums;
  const sorted = [...albums].sort((a, b) => ORDER.compare(cellText(a, sort.column).trim(), cellText(b, sort.column).trim()));
  return sort.reversed ? sorted.reverse() : sorted;
}

// where a cell leads to, in the filters of the page : years lead nowhere
export function cellFilter(album: FeedAlbum, column: FeedColumn): string | undefined {
  switch (column) {
    case 'Year':
      return undefined;
    case 'Genre':
      return JSON.stringify({ genreUI: album.Genre, artistUI: null, albumUI: null });
    case 'Artist':
      return JSON.stringify({ genreUI: album.Genre, artistUI: album.Artist, albumUI: null });
    case 'Album':
      return JSON.stringify({ genreUI: album.Genre, artistUI: album.Artist, albumUI: album.Album });
  }
}
