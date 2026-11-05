import { describe, expect, test } from 'bun:test';
import {
  appliedFilters,
  filterSizesCss,
  NO_FILTER,
  nextSorters,
  parseSorters,
  pickedFilter,
  sorterText,
  sortIcon,
} from '../discover/filters';

describe('filters', () => {
  const selected = { genreUI: 'Rock', artistUI: 'Björk', albumUI: 'Vespertine' };

  test('a filter that changes clears those it narrows', () => {
    expect(appliedFilters(selected, { genreUI: 'Jazz' })).toEqual({ genreUI: 'Jazz', artistUI: null, albumUI: null });
    expect(appliedFilters(selected, { artistUI: 'Air' })).toEqual({ genreUI: 'Rock', artistUI: 'Air', albumUI: null });
  });

  test('removing one too', () => {
    expect(appliedFilters(selected, { genreUI: null })).toEqual(NO_FILTER);
  });

  test('it does not touch those before it', () => {
    expect(appliedFilters(selected, { albumUI: 'Debut' })).toEqual({ ...selected, albumUI: 'Debut' });
  });

  test('those it is told are kept', () => {
    expect(appliedFilters(selected, { genreUI: 'Jazz', artistUI: 'Air', albumUI: 'Moon' })).toEqual({
      genreUI: 'Jazz',
      artistUI: 'Air',
      albumUI: 'Moon',
    });
  });

  test('the same values change nothing, the album stays', () => {
    expect(appliedFilters(selected, { genreUI: 'Rock', artistUI: 'Björk' })).toEqual(selected);
  });

  test('picking again removes, including a name reading as a number', () => {
    const genre2000 = { ...NO_FILTER, genreUI: '2000' };
    expect(pickedFilter(NO_FILTER, 'genreUI', '2000')).toEqual({ genreUI: '2000' });
    expect(pickedFilter(genre2000, 'genreUI', '2000')).toEqual({ genreUI: null });
    expect(pickedFilter(genre2000, 'genreUI', 'Jazz')).toEqual({ genreUI: 'Jazz' });
  });
});

describe('sorters', () => {
  test('by count at first', () => {
    expect(parseSorters(null)).toEqual({ active: 'count', directions: { count: 'desc', order: 'asc' } });
  });

  test('as they were stored', () => {
    expect(parseSorters('order:desc')).toEqual({ active: 'order', directions: { count: 'desc', order: 'desc' } });
    expect(sorterText(parseSorters('order:desc'))).toBe('order:desc');
  });

  test('what was stored makes no sense', () => {
    for (const stored of ['', 'nonsense', 'count', 'name:asc', 'count:sideways']) {
      expect(sorterText(parseSorters(stored))).toBe('count:desc');
    }
  });

  test('another button takes over as it was left, the active one swaps', () => {
    const first = parseSorters(null);
    const byName = nextSorters(first, 'order');
    expect(sorterText(byName)).toBe('order:asc');

    const reversed = nextSorters(byName, 'order');
    expect(sorterText(reversed)).toBe('order:desc');

    expect(sorterText(nextSorters(reversed, 'count'))).toBe('count:desc');
    expect(sorterText(nextSorters(nextSorters(reversed, 'count'), 'order'))).toBe('order:desc');
  });

  test('their icons', () => {
    expect(sortIcon('count', 'desc')).toBe('fa-sort-amount-down');
    expect(sortIcon('order', 'asc')).toBe('fa-sort-alpha-up');
  });
});

describe('sizes of a list', () => {
  test('closed as its placeholder, open as its list, a little over', () => {
    const css = filterSizesCss('genreUI', { width: 40, height: 20 }, { width: 99, height: 159 }, 20);
    expect(css).toBe('#genreUI{width : 2.1rem;}#genreUI.open {width : 5.1rem;}#genreUI{height : 1.1rem;}#genreUI.open {height : 8.1rem;}');
  });

  test('closed as its list when nothing is selected', () => {
    const css = filterSizesCss('genreUI', { width: 0, height: 0 }, { width: 99, height: 159 }, 20);
    expect(css).toBe('#genreUI{width : 5.1rem;}#genreUI.open {width : 5.1rem;}#genreUI{height : 8.1rem;}#genreUI.open {height : 8.1rem;}');
  });
});
