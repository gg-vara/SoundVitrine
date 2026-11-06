import { describe, expect, test } from 'bun:test';
import { createNameSearch } from '../library/search';

const search = (typed: string, ...names: string[]) => createNameSearch(names)(typed, 100);

// what is highlighted of a name, for what is typed
function highlighted(name: string, typed: string): string | null {
  const [found] = search(typed, name);
  return found ? name.slice(found[1][0], found[1][1]) : null;
}

describe('accents and case', () => {
  test.each([
    ['Björk', 'bjork', 'Björk'],
    ['Björk', 'BJÖ', 'Bjö'],
    ['Sigur Rós', 'ros', 'Rós'],
    ['Beyoncé', 'once', 'oncé'],
    ['Motörhead', 'tor', 'tör'],
    ['Dvořák', 'dvorak', 'Dvořák'],
  ])('%s, typing %s, highlights %s', (name, typed, expected) => {
    expect(highlighted(name, typed)).toBe(expected);
  });

  test('accents written as separate characters', () => {
    expect(highlighted('Björk', 'bjo')).toBe('Bjö');
    expect(highlighted('Björk', 'björ')).toBe('Björ');
  });
});

describe('letters without an accent to remove', () => {
  test.each([
    ['Røyksopp', 'royk', 'Røyk'],
    ['Mø', 'mo', 'Mø'],
    ['Mø', 'm', 'M'],
    ['Straße', 'strasse', 'Straße'],
    ['Œuvre', 'oe', 'Œ'],
  ])('%s, typing %s, highlights %s', (name, typed, expected) => {
    expect(highlighted(name, typed)).toBe(expected);
  });

  test('one letter spelled out as two, partly typed', () => {
    expect(highlighted('Ærosmith', 'a')).toBe('Æ');
    expect(highlighted('Ærosmith', 'aero')).toBe('Æro');
    expect(highlighted('Ærosmith', 'er')).toBe('Ær');
  });
});

describe('other scripts', () => {
  test.each([
    ['坂本龍一', '坂', '坂'],
    ['坂本龍一', '本龍', '本龍'],
    ['椎名林檎', '林檎', '林檎'],
    ['きゃりーぱみゅぱみゅ', 'ぱみゅ', 'ぱみゅ'],
    ['BTS 방탄소년단', '방탄', '방탄'],
    ['Земфира', 'земф', 'Земф'],
    ['ДДТ', 'ддт', 'ДДТ'],
    ['Μίκης Θεοδωράκης', 'θεοδωρακης', 'Θεοδωράκης'],
    ['فيروز', 'فير', 'فير'],
    ['हिन्दी गायक', 'हिन्दी', 'हिन्दी'],
    ['Tata Young ทาทา', 'ทาทา', 'ทาทา'],
  ])('%s, typing %s, highlights %s', (name, typed, expected) => {
    expect(highlighted(name, typed)).toBe(expected);
  });

  test('characters outside the basic plane', () => {
    expect(highlighted('𠮷田拓郎', '𠮷田')).toBe('𠮷田');
  });

  test('half and full width forms', () => {
    expect(highlighted('ＡＢＣ', 'abc')).toBe('ＡＢＣ');
  });

  test('marks making vowels are not ignored', () => {
    expect(search('हन', 'हिन्दी')).toEqual([]);
  });

  test('only what matches, not everyone', () => {
    expect(search('坂', 'Björk', '坂本龍一', '椎名林檎').map(([name]) => name)).toEqual(['坂本龍一']);
  });
});

describe('separators and symbols', () => {
  test.each([
    ['Simon & Garfunkel', 'simon and g', 'Simon & G'],
    ['Simon & Garfunkel', 'simon & g', 'Simon & G'],
    ['AC/DC', 'ac dc', 'AC/DC'],
    ['AC/DC', 'ac/dc', 'AC/DC'],
    ['The "Quoted" Band', 'quoted band', 'Quoted" Band'],
    ["Guns N' Roses", 'n roses', "N' Roses"],
    ['  Spaces  Twice', 'spaces twice', 'Spaces  Twice'],
    ['R.E.M.', 'rem', 'R.E.M'],
  ])('%s, typing %s, highlights %s', (name, typed, expected) => {
    expect(highlighted(name, typed)).toBe(expected);
  });

  test('a space being typed still finds the name', () => {
    expect(highlighted('Sigur Rós', 'sigur ')).toBe('Sigur ');
  });

  test('names made of symbols only', () => {
    expect(highlighted('!!!', '!!!')).toBe('!!!');
    expect(highlighted('+/-', '+/-')).toBe('+/-');
  });

  test('symbols typed find nobody by accident', () => {
    expect(search('!!!', 'Björk', '坂本龍一')).toEqual([]);
  });

  test('only spaces, nothing asked', () => {
    expect(search('   ', 'Björk')).toEqual([]);
  });

  test('emoji in a name are not in the way', () => {
    expect(highlighted('Band 🎸 Name', 'band name')).toBe('Band 🎸 Name');
  });
});

describe('results', () => {
  test('in the order given, up to the limit', () => {
    const find = createNameSearch(['ab', 'abc', 'abcd']);
    expect(find('ab', 2).map(([name]) => name)).toEqual(['ab', 'abc']);
  });

  test('what can be passed to substring', () => {
    for (const name of ['Røyksopp', '𠮷田拓郎', 'Björk', 'Band 🎸 Name']) {
      const [[, [start, end]] = ['', [-1, -1]]] = search(name, name);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(name.length);
    }
  });

  test('a name made of nothing', () => {
    expect(search('a', '')).toEqual([]);
  });
});
