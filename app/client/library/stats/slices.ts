// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What a pie of the stats shows, apart from any page : see tests/stats.test.ts

export interface Slices {
  labels: string[];
  values: number[];
  colors: string[];
}

// as Highcharts drew them
const COLORS = ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'];

// the largest first, as the server sends them : an object can't keep that order, names like "2000" coming first
export function slicesOf(counts: Record<string, number>): Slices {
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
  return {
    labels: entries.map(([label]) => label),
    values: entries.map(([, value]) => value),
    colors: entries.map((_, index) => COLORS[index % COLORS.length] as string),
  };
}

// from the text of the translations, a canvas showing no tags
export function tooltipText(format: string, value: number, total: number, series: string): string {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return format
    .replace(/<\/?b>/g, '')
    .replace('{point.y}', String(value))
    .replace('{point.percentage:.1f}', percentage.toFixed(1))
    .replace('{series.name}', series);
}

// a click pulls a slice out, and a next one on it puts it back
export const nextSelected = (selected: number | null, clicked: number | undefined): number | null =>
  clicked === undefined || clicked === selected ? null : clicked;

export const offsetsOf = (count: number, selected: number | null, offset: number): number[] =>
  Array.from({ length: count }, (_, index) => (index === selected ? offset : 0));
