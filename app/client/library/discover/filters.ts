// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the discover panel decides, no page here : see tests/discover.test.ts

export interface DiscoverFilter {
  genreUI: string | null;
  artistUI: string | null;
  albumUI: string | null;
}

export type FilterId = keyof DiscoverFilter;

// each one narrows the next
const FILTER_IDS: FilterId[] = ['genreUI', 'artistUI', 'albumUI'];

export const NO_FILTER: DiscoverFilter = { genreUI: null, artistUI: null, albumUI: null };

// a filter that changes clears those it narrows, unless told their value too
export function appliedFilters(current: DiscoverFilter, wanted: Partial<DiscoverFilter>): DiscoverFilter {
  const next = { ...current };
  let changed = false;

  for (const id of FILTER_IDS) {
    const value = wanted[id];
    if (value === undefined) {
      if (changed) next[id] = null;
    } else if ((value || null) !== current[id]) {
      next[id] = value || null;
      changed = true;
    }
  }
  return next;
}

// picking what is selected removes it
export const pickedFilter = (current: DiscoverFilter, id: FilterId, name: string): Partial<DiscoverFilter> => ({
  [id]: current[id] === name ? null : name,
});

// what Escape closes : the list opened last. Only a selected filter's list can close, as it is all there is otherwise
export const listToClose = (opened: FilterId[], current: DiscoverFilter): FilterId | undefined => opened.filter(id => current[id]).at(-1);

export type SortCategory = 'count' | 'order';
export type SortDirection = 'asc' | 'desc';

export interface Sorters {
  active: SortCategory;
  // each button remembers its own
  directions: Record<SortCategory, SortDirection>;
}

export const SORT_CATEGORIES: SortCategory[] = ['count', 'order'];

const DEFAULT_SORTER = 'count:desc';
const DEFAULT_DIRECTIONS: Record<SortCategory, SortDirection> = { count: 'desc', order: 'asc' };

const isCategory = (value: string | undefined): value is SortCategory => value === 'count' || value === 'order';
const isDirection = (value: string | undefined): value is SortDirection => value === 'asc' || value === 'desc';

// from what was stored by sorterText
export function parseSorters(stored: string | null): Sorters {
  const [category, direction] = (stored ?? DEFAULT_SORTER).split(':');
  if (!isCategory(category) || !isDirection(direction)) return parseSorters(DEFAULT_SORTER);
  return { active: category, directions: { ...DEFAULT_DIRECTIONS, [category]: direction } };
}

export const sorterText = ({ active, directions }: Sorters) => `${active}:${directions[active]}`;

// another button takes over as it was left, the active one swaps its direction
export function nextSorters(current: Sorters, category: SortCategory): Sorters {
  if (current.active !== category) return { ...current, active: category };
  return { ...current, directions: { ...current.directions, [category]: current.directions[category] === 'asc' ? 'desc' : 'asc' } };
}

export const sortIcon = (category: SortCategory, direction: SortDirection) =>
  `fa-sort-${category === 'order' ? 'alpha' : 'amount'}-${direction === 'asc' ? 'up' : 'down'}`;

export interface Size {
  width: number;
  height: number;
}

// .filterUI animates between closed and open : CSS can only do that between sizes it is told, in rem to follow the root font
export function filterSizesCss(id: string, placeholder: Size, list: Size, rootFontSize: number): string {
  const rem = (pixels: number) => Math.ceil((pixels / rootFontSize) * 10) / 10 + 0.1;
  const closed = (side: keyof Size) => rem(placeholder[side] || list[side] + 1);
  const open = (side: keyof Size) => rem(list[side] + 1);

  return (
    `#${id}{width : ${closed('width')}rem;}#${id}.open {width : ${open('width')}rem;}` +
    `#${id}{height : ${closed('height')}rem;}#${id}.open {height : ${open('height')}rem;}`
  );
}
