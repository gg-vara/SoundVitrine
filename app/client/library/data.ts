// What the panels show of a library, from unified.json (server/library.ts). No page here : see tests/library-data.test.ts

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
  // [slug, artist] pairs
  slug: [string, string][];
  // albums by id
  glul: Record<string, FeedAlbum>;
}

export interface DiscoverFilter {
  genreUI: string | null;
  artistUI: string | null;
  albumUI: string | null;
}

// what the page decides
export interface DataFeedsContext {
  filter: () => DiscoverFilter;
  // "count:desc", "order:asc"...
  sorter: () => string;
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
  sIndexRange: [number, number];
}

const MAX_SEARCH_RESULTS = 100;
const MAX_FEED_ALBUMS = 100;

const SLUG_FROM = 'àáäâãåèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;';
const SLUG_TO = 'aaaaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------';
const SLUG_SPECIALS = new RegExp(SLUG_FROM.split('').join('|'), 'g');

// keepingLength : a character it would remove becomes a "-", for positions to stay those of the name
export function slugify(text: string, keepingLength = false): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(SLUG_SPECIALS, character => SLUG_TO.charAt(SLUG_FROM.indexOf(character)))
    .replace(/&/g, '-and-')
    .replace(/[^\w-]+/g, keepingLength ? '-' : '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '');
}

// where in a name its match goes, to highlight it. The slugs of the server do not always read as these ("ø" becomes "o"
// there, "-" here) : the letters may never all be found, which must end anyway
export function foundRange(name: string, slug: string, from: number): [number, number] {
  const rest = slugify(name, true).substring(from);
  let position = 0;
  let found = 0;
  while (found < slug.length && position < rest.length) {
    if (rest[position] === slug[found]) found++;
    position++;
  }
  return [from, from + position];
}

// by name, then as the page sorts them
function sortable(data: Record<string, unknown>, sorter: string): FilterItem[] {
  const items = Object.keys(data)
    .sort()
    .map((name, index) => ({ nFilter: name, count: data[name], order: index + 1 }));

  const [category, direction, ...others] = sorter.split(':');
  if (others.length > 0 || direction === undefined) return items;

  const sortValue = (item: FilterItem) => item[category as keyof FilterItem] as number;
  return items.sort((a, b) => (direction.includes('asc') ? sortValue(a) - sortValue(b) : sortValue(b) - sortValue(a)));
}

export function createDataFeeds(library: UnifiedLibrary, context: DataFeedsContext) {
  return {
    genreUI: () => sortable(library.albgc, context.sorter()),

    artistUI: () => {
      const genre = context.filter().genreUI;
      if (!genre) return undefined;
      const artists = library.arbgl[genre] ?? [];
      return sortable(
        Object.fromEntries(artists.map(artist => [artist, Object.keys(library.abal[artist]?.Albums ?? {}).length])),
        context.sorter(),
      );
    },

    albumUI: () => {
      const artist = context.filter().artistUI;
      if (!artist) return undefined;
      const albums = library.abal[artist]?.Albums ?? {};
      return sortable(Object.fromEntries(Object.entries(albums).map(([name, album]) => [name, album.Year])), context.sorter());
    },

    albumInfos: () => {
      const { artistUI: artist, albumUI: name } = context.filter();
      if (!artist || !name) return undefined;
      const album = library.abal[artist]?.Albums[name];
      return album && { ...album, Album: name, Artist: artist };
    },

    searchBand: (criteria: string) => {
      if (!criteria) return undefined;
      const slug = slugify(criteria);

      const results: [string, SearchResult][] = [];
      for (const [artistSlug, artist] of library.slug) {
        if (results.length === MAX_SEARCH_RESULTS) break;
        const index = artistSlug.indexOf(slug);
        if (index > -1) {
          results.push([artist, { Genres: library.abal[artist]?.Genres ?? [], sIndexRange: foundRange(artist, slug, index) }]);
        }
      }
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
