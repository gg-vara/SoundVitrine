import { describe, expect, test } from 'bun:test';
import { cellFilter, cellText, nextSort, sortedAlbums } from '../feed/table';
import type { FeedAlbum } from '../library/data';

const album = (Album: string, Artist: string, Genre: string, Year: unknown): FeedAlbum => ({
  Album,
  Artist,
  Genre,
  Year,
  DateAdded: '2020-01-01',
});

const albums = [
  album('Album 10', 'björk', 'Rock', 2001),
  album('Album 9', 'Zappa', 'Électro', 1999),
  album('album 2', 'Abba', 'jazz', null),
];
const column = (list: FeedAlbum[], name: 'Album' | 'Artist' | 'Genre' | 'Year') => list.map(item => cellText(item, name));

describe('sorting', () => {
  test('nothing asked keeps the order given', () => {
    expect(sortedAlbums(albums, null)).toBe(albums);
  });

  test('does not change the list given', () => {
    const before = [...albums];
    sortedAlbums(albums, { column: 'Artist', reversed: false });
    expect(albums).toEqual(before);
  });

  test('numbers in their order', () => {
    expect(column(sortedAlbums(albums, { column: 'Album', reversed: false }), 'Album')).toEqual(['album 2', 'Album 9', 'Album 10']);
  });

  test('whatever the case', () => {
    expect(column(sortedAlbums(albums, { column: 'Artist', reversed: false }), 'Artist')).toEqual(['Abba', 'björk', 'Zappa']);
  });

  test('accents among their letters', () => {
    const genres = column(sortedAlbums(albums, { column: 'Genre', reversed: false }), 'Genre');
    expect(genres).toEqual(['Électro', 'jazz', 'Rock']);
  });

  test('years, what has none first', () => {
    expect(column(sortedAlbums(albums, { column: 'Year', reversed: false }), 'Year')).toEqual(['', '1999', '2001']);
  });

  test('reversed', () => {
    expect(column(sortedAlbums(albums, { column: 'Year', reversed: true }), 'Year')).toEqual(['2001', '1999', '']);
  });

  test('other scripts do not fail', () => {
    const others = [album('坂', 'x', 'g', 1), album('Я', 'x', 'g', 1), album('a', 'x', 'g', 1)];
    expect(sortedAlbums(others, { column: 'Album', reversed: false })).toHaveLength(3);
  });
});

describe('clicks on columns', () => {
  test('a first click sorts', () => {
    expect(nextSort(null, 'Year')).toEqual({ column: 'Year', reversed: false });
  });

  test('a next click on it reverses, and the next one back', () => {
    const once = nextSort(null, 'Year');
    const twice = nextSort(once, 'Year');
    expect(twice.reversed).toBe(true);
    expect(nextSort(twice, 'Year').reversed).toBe(false);
  });

  test('another column starts over', () => {
    expect(nextSort({ column: 'Year', reversed: true }, 'Album')).toEqual({ column: 'Album', reversed: false });
  });
});

describe('cells', () => {
  const item = album('An album', 'An artist', 'A genre', 2000);

  test('a missing value is empty', () => {
    expect(cellText(album('a', 'b', 'c', null), 'Year')).toBe('');
    expect(cellText(album('a', 'b', 'c', undefined), 'Year')).toBe('');
  });

  test('a year leads nowhere', () => {
    expect(cellFilter(item, 'Year')).toBeUndefined();
  });

  test('the others lead to what they show', () => {
    expect(JSON.parse(cellFilter(item, 'Genre') ?? '')).toEqual({ genreUI: 'A genre', artistUI: null, albumUI: null });
    expect(JSON.parse(cellFilter(item, 'Artist') ?? '')).toEqual({ genreUI: 'A genre', artistUI: 'An artist', albumUI: null });
    expect(JSON.parse(cellFilter(item, 'Album') ?? '')).toEqual({ genreUI: 'A genre', artistUI: 'An artist', albumUI: 'An album' });
  });
});
