import { describe, expect, test } from 'bun:test';
import { createDataFeeds, type DiscoverFilter, type UnifiedLibrary } from '../library/data';

const album = (year: number, date: string, tracks: Record<string, string> = { '1.1': 'a track' }) => ({
  Year: year,
  Genre: 'Rock',
  Tracks: tracks,
  DateAdded: date,
});

const library: UnifiedLibrary = {
  arbgl: { Rock: ['Björk', 'Røyksopp'], Jazz: ['Björk'] },
  arbgc: { Rock: 2, Jazz: 1 },
  albgl: { Rock: ['x', 'y', 'z'], Jazz: ['w'] },
  albgc: { Rock: 3, Jazz: 1 },
  abal: {
    Björk: { Genres: ['Rock', 'Jazz'], Albums: { Vespertine: album(2001, '2020-01-01'), Homogenic: album(1997, '2020-01-02') } },
    Røyksopp: { Genres: ['Rock'], Albums: { Melody: album(2001, '2024-01-03') } },
  },
  slug: [
    ['bjork', 'Björk'],
    ['royksopp', 'Røyksopp'],
  ],
  glul: {
    a: { Album: 'Vespertine', Artist: 'Björk', Year: 2001, DateAdded: '2020-01-01', Genre: 'Rock' },
    b: { Album: 'Homogenic', Artist: 'Björk', Year: 1997, DateAdded: '2020-01-02', Genre: 'Rock' },
    c: { Album: 'Melody', Artist: 'Røyksopp', Year: 2001, DateAdded: '2024-01-03', Genre: 'Rock' },
  },
};

function feeds(filter: Partial<DiscoverFilter> = {}, sorter = 'order:asc') {
  return createDataFeeds(library, {
    filter: () => ({ genreUI: null, artistUI: null, albumUI: null, ...filter }),
    sorter: () => sorter,
    humanizedSince: date => `in ${date.slice(0, 4)}`,
    now: () => new Date('2026-01-01'),
  });
}

const names = (items: { nFilter: string }[] | undefined) => items?.map(item => item.nFilter);

describe('filters', () => {
  test('genres, by name, with their album count', () => {
    expect(feeds().genreUI()).toEqual([
      { nFilter: 'Jazz', count: 1, order: 1 },
      { nFilter: 'Rock', count: 3, order: 2 },
    ]);
  });

  test('sorted as the page asks', () => {
    expect(names(feeds({}, 'count:desc').genreUI())).toEqual(['Rock', 'Jazz']);
    expect(names(feeds({}, 'count:asc').genreUI())).toEqual(['Jazz', 'Rock']);
    expect(names(feeds({}, 'order:desc').genreUI())).toEqual(['Rock', 'Jazz']);
  });

  test('a sorter that makes no sense keeps them by name', () => {
    expect(names(feeds({}, 'nonsense').genreUI())).toEqual(['Jazz', 'Rock']);
  });

  test('artists of the chosen genre, with their album count', () => {
    expect(feeds().artistUI()).toBeUndefined();
    expect(feeds({ genreUI: 'Rock' }).artistUI()).toEqual([
      { nFilter: 'Björk', count: 2, order: 1 },
      { nFilter: 'Røyksopp', count: 1, order: 2 },
    ]);
  });

  test('albums of the chosen artist, with their year', () => {
    expect(feeds().albumUI()).toBeUndefined();
    expect(feeds({ artistUI: 'Björk' }).albumUI()).toEqual([
      { nFilter: 'Homogenic', count: 1997, order: 1 },
      { nFilter: 'Vespertine', count: 2001, order: 2 },
    ]);
  });

  test('a filter pointing at nothing shows nothing', () => {
    expect(feeds({ genreUI: 'Unknown' }).artistUI()).toEqual([]);
    expect(feeds({ artistUI: 'Unknown' }).albumUI()).toEqual([]);
    expect(feeds({ artistUI: 'Unknown', albumUI: 'Unknown' }).albumInfos()).toBeUndefined();
  });
});

describe('album infos', () => {
  test('needs an artist and an album', () => {
    expect(feeds({ artistUI: 'Björk' }).albumInfos()).toBeUndefined();
  });

  test('adds their names, without changing the library', () => {
    const infos = feeds({ artistUI: 'Björk', albumUI: 'Vespertine' }).albumInfos();
    expect(infos).toMatchObject({ Album: 'Vespertine', Artist: 'Björk', Year: 2001 });
    expect(library.abal.Björk?.Albums.Vespertine).not.toHaveProperty('Album');
  });
});

describe('search', () => {
  test('nothing asked, nothing found', () => {
    expect(feeds().searchBand('')).toBeUndefined();
    expect(feeds().searchBand('zzz')).toBeNull();
  });

  test('with accents or not', () => {
    expect(feeds().searchBand('bjo')).toEqual({ Björk: { Genres: ['Rock', 'Jazz'], sIndexRange: [0, 3] } });
    expect(feeds().searchBand('BJÖ')).toEqual({ Björk: { Genres: ['Rock', 'Jazz'], sIndexRange: [0, 3] } });
  });

  // used to freeze the page
  test('a name with a letter having no accent to remove', () => {
    const found = feeds().searchBand('royk');
    expect(Object.keys(found ?? {})).toEqual(['Røyksopp']);
    expect(found?.Røyksopp?.sIndexRange).toEqual([0, 4]);
  });

  test('at most 100 results', () => {
    const many = Array.from({ length: 150 }, (_, index) => `band ${index}`);
    const large: UnifiedLibrary = {
      ...library,
      slug: many.map(name => [name, name]),
      abal: Object.fromEntries(many.map(name => [name, { Genres: [], Albums: {} }])),
    };
    const found = createDataFeeds(large, {
      filter: () => ({ genreUI: null, artistUI: null, albumUI: null }),
      sorter: () => '',
      humanizedSince: () => '',
      now: () => new Date(),
    }).searchBand('band');
    expect(Object.keys(found ?? {})).toHaveLength(100);
  });
});

describe('feed', () => {
  test('all the albums of each interval, the latest first', () => {
    const uploads = feeds().feedUploads();
    expect(Object.keys(uploads)).toEqual(['in 2024', 'in 2020']);
    expect(uploads['in 2024']?.map(item => item.Album)).toEqual(['Melody']);
    expect(uploads['in 2020']?.map(item => item.Album)).toEqual(['Homogenic', 'Vespertine']);
  });

  test('the latest 100 only', () => {
    const glul = Object.fromEntries(
      Array.from({ length: 120 }, (_, index) => [
        `id${index}`,
        { Album: `a${index}`, Artist: 'x', Year: 2000, DateAdded: `2020-01-${String(index).padStart(3, '0')}`, Genre: 'g' },
      ]),
    );
    const uploads = createDataFeeds(
      { ...library, glul },
      {
        filter: () => ({ genreUI: null, artistUI: null, albumUI: null }),
        sorter: () => '',
        humanizedSince: () => 'one',
        now: () => new Date(),
      },
    ).feedUploads();
    expect(uploads.one).toHaveLength(100);
    expect(uploads.one?.[0]?.Album).toBe('a119');
  });

  test('an interval named as an object property is an interval like any other', () => {
    const uploads = createDataFeeds(library, {
      filter: () => ({ genreUI: null, artistUI: null, albumUI: null }),
      sorter: () => '',
      humanizedSince: () => 'constructor',
      now: () => new Date(),
    }).feedUploads();
    expect(uploads.constructor).toHaveLength(3);
  });
});

describe('an empty library', () => {
  // empty lists come as [] from the server
  const empty = { arbgl: [], arbgc: [], albgl: [], albgc: [], abal: [], slug: [], glul: [] } as unknown as UnifiedLibrary;
  const it = createDataFeeds(empty, {
    filter: () => ({ genreUI: null, artistUI: null, albumUI: null }),
    sorter: () => 'count:desc',
    humanizedSince: () => '',
    now: () => new Date(),
  });

  test('shows nothing, without failing', () => {
    expect(it.genreUI()).toEqual([]);
    expect(it.searchBand('a')).toBeNull();
    expect(it.feedUploads()).toEqual({});
  });
});
