// What the panels show of a library, from unified.json (server/library.ts). No page here : see tests/library-data.test.ts
import { createNameSearch, type Range } from './search';

export interface Album {
  Year: unknown;
  Genre: string;
  Tracks: Record<string, string>;
  DateAdded: string;
}

export interface FeedAlbum {
  Album: string;
  Artist: string;
  Year: unknown;
  DateAdded: string;
  Genre: string;
}

export interface UnifiedLibrary {
  // artists by genre, and their count
  arbgl: Record<string, string[]>;
  arbgc: Record<string, number>;
  // albums by genre, and their count
  albgl: Record<string, string[]>;
  albgc: Record<string, number>;
  abal: Record<string, { Genres: string[]; Albums: Record<string, Album> }>;
  // the shortest names first : the server sorts them so
  artists: string[];
  // albums by id
  glul: Record<string, FeedAlbum>;
}

// what the page decides
export interface DataFeedsContext {
  // "2 years ago", in the language of the page
  humanizedSince: (date: string, now: Date) => string;
  now: () => Date;
}

export interface FilterItem {
  nFilter: string;
  count: unknown;
  order: number;
}

export interface SearchResult {
  Genres: string[];
  sIndexRange: Range;
}

const MAX_SEARCH_RESULTS = 100;
const MAX_FEED_ALBUMS = 100;

// by name
function itemsOf(data: Record<string, unknown>): FilterItem[] {
  return Object.keys(data)
    .sort()
    .map((name, index) => ({ nFilter: name, count: data[name], order: index + 1 }));
}

// "count:desc", "order:asc"...
export function sortItems(items: FilterItem[], sorter: string): FilterItem[] {
  const [category, direction, ...others] = sorter.split(':');
  if (others.length > 0 || direction === undefined) return items;

  const sortValue = (item: FilterItem) => item[category as keyof FilterItem] as number;
  return [...items].sort((a, b) => (direction.includes('asc') ? sortValue(a) - sortValue(b) : sortValue(b) - sortValue(a)));
}

export function createDataFeeds(library: UnifiedLibrary, context: DataFeedsContext) {
  const searchNames = createNameSearch(library.artists);

  return {
    genreUI: () => itemsOf(library.albgc),

    artistUI: (genre: string | null) => {
      if (!genre) return undefined;
      const artists = library.arbgl[genre] ?? [];
      return itemsOf(Object.fromEntries(artists.map(artist => [artist, Object.keys(library.abal[artist]?.Albums ?? {}).length])));
    },

    albumUI: (artist: string | null) => {
      if (!artist) return undefined;
      const albums = library.abal[artist]?.Albums ?? {};
      return itemsOf(Object.fromEntries(Object.entries(albums).map(([name, album]) => [name, album.Year])));
    },

    albumInfos: (artist: string | null, name: string | null) => {
      if (!artist || !name) return undefined;
      const album = library.abal[artist]?.Albums[name];
      return album && { ...album, Album: name, Artist: artist };
    },

    searchBand: (criteria: string) => {
      if (!criteria) return undefined;
      const results = searchNames(criteria, MAX_SEARCH_RESULTS).map(([artist, range]): [string, SearchResult] => [
        artist,
        { Genres: library.abal[artist]?.Genres ?? [], sIndexRange: range },
      ]);
      return results.length ? Object.fromEntries(results) : null;
    },

    statsAlbums: () => library.albgc,
    statsArtists: () => library.arbgc,

    // the latest albums, by how long ago they were added
    feedUploads: () => {
      const now = context.now();
      const latest = Object.values(library.glul)
        .sort((a, b) => (b.DateAdded < a.DateAdded ? -1 : b.DateAdded > a.DateAdded ? 1 : 0))
        .slice(0, MAX_FEED_ALBUMS);

      const intervals: Record<string, FeedAlbum[]> = {};
      for (const album of latest) {
        const interval = context.humanizedSince(album.DateAdded, now);
        if (!Object.hasOwn(intervals, interval)) intervals[interval] = [];
        intervals[interval].push(album);
      }
      return intervals;
    },
  };
}
