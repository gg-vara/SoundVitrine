import { describe, expect, test } from 'bun:test';
import type { Track } from '../library';
import { slugify, toJson, unifiedLibrary } from '../library';

const track = (name: string, album: string, artist: string, genre: string, added: string, number = 1): Track => ({
  Name: name,
  Album: album,
  'Album Artist': artist,
  Genre: genre,
  Year: 1997,
  'Disc Number': 1,
  'Track Number': number,
  'Date Added': added,
});

const tracks = [
  track('One', 'First', 'Long Artist', 'heavy metal', '2020-01-01T00:00:00Z'),
  track('Two', 'First', 'Long Artist', 'heavy metal', '2021-01-01T00:00:00Z', 2),
  track('Three', 'Other', 'Abc', 'Rock', '2019-01-01T00:00:00Z'),
  track('Four', 'Third', 'Bcd', 'Rock', '2019-01-01T00:00:00Z'),
];

const unified = () => JSON.parse(toJson(unifiedLibrary(tracks)));

describe('unifiedLibrary', () => {
  test('lists and counts by genre, the largest first', () => {
    const { albgl, albgc, arbgc } = unified();
    expect(albgl['Heavy Metal']).toEqual(['First_Long Artist_1997']);
    expect(Object.entries(albgc)).toEqual([
      ['Rock', 2],
      ['Heavy Metal', 1],
    ]);
    expect(arbgc.Rock).toBe(2);
  });

  test('albums by artist, tracks by "disc.track"', () => {
    const artist = unified().abal['Long Artist'];
    expect(artist.Albums.First.Tracks).toEqual({ '1.1': 'One', '1.2': 'Two' });
    expect(artist.Albums.First.Genre).toBe('Heavy Metal');
    expect(artist.Genres).toEqual(['Heavy Metal']);
  });

  test('an album is dated by its latest track', () => {
    expect(unified().glul['First_Long Artist_1997'].DateAdded).toBe('2021-01-01T00:00:00Z');
  });

  test('slugs : the shortest artists first, then alphabetically', () => {
    expect(unified().slug).toEqual([
      ['abc', 'Abc'],
      ['bcd', 'Bcd'],
      ['long-artist', 'Long Artist'],
    ]);
  });
});

describe('toJson', () => {
  test('keeps integer-like keys in order', () => {
    expect(
      toJson(
        new Map([
          ['b', 1],
          ['2000', 2],
        ]),
      ),
    ).toBe('{"b":1,"2000":2}');
  });

  test('missing values are null, empty maps arrays, as PHP wrote them', () => {
    expect(toJson({ missing: undefined, empty: new Map() })).toBe('{"missing":null,"empty":[]}');
  });
});

describe('slugify', () => {
  test.each([
    ['Sigur Rós', 'sigur-ros'],
    ['AC/DC', 'ac-dc'],
    ['Simon & Garfunkel', 'simon-and-garfunkel'],
    ['  Leading', 'leading'],
    ['Björk: Live', 'bjork-live'],
  ])('%s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});
