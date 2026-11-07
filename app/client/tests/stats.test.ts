import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Glob } from 'bun';
import { nextSelected, offsetsOf, slicesOf, tooltipText } from '../library/stats/slices';

describe('slices', () => {
  test('the largest first, even with names reading as numbers', () => {
    const { labels, values } = slicesOf({ '2000': 32, Rock: 36, 'Heavy Metal': 35 });
    expect(labels).toEqual(['Rock', 'Heavy Metal', '2000']);
    expect(values).toEqual([36, 35, 32]);
  });

  test('colors start over once used up', () => {
    const counts = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`genre ${index}`, 1]));
    const { colors } = slicesOf(counts);
    expect(colors).toHaveLength(12);
    expect(colors[10]).toBe(colors[0] as string);
  });

  test('no data, no slices', () => {
    expect(slicesOf({}).labels).toEqual([]);
    // empty lists come as [] from the server
    expect(slicesOf([] as unknown as Record<string, number>).labels).toEqual([]);
  });
});

describe('tooltip', () => {
  const format = '<b>{point.y}</b>, ou <b>{point.percentage:.1f}%</b> de la catégorie {series.name}';

  test('fills the translation, without its tags', () => {
    expect(tooltipText(format, 32, 167, 'Albums')).toBe('32, ou 19.2% de la catégorie Albums');
  });

  test('a total of nothing does not divide by it', () => {
    expect(tooltipText(format, 0, 0, 'Albums')).toBe('0, ou 0.0% de la catégorie Albums');
  });
});

describe('selecting', () => {
  test('a click pulls out, the same click puts back', () => {
    expect(nextSelected(null, 2)).toBe(2);
    expect(nextSelected(2, 2)).toBeNull();
  });

  test('another slice takes over', () => {
    expect(nextSelected(2, 3)).toBe(3);
  });

  test('a click beside the pie puts back', () => {
    expect(nextSelected(2, undefined)).toBeNull();
  });

  test('only the selected one moves', () => {
    expect(offsetsOf(3, 1, 10)).toEqual([0, 10, 0]);
    expect(offsetsOf(2, null, 10)).toEqual([0, 0]);
  });
});

// most visits never open the stats, and must not download Chart.js
describe('loading', () => {
  const client = join(import.meta.dir, '..');
  const sources = [...new Glob('**/*.{ts,tsx}').scanSync(client)]
    .map(file => file.replaceAll('\\', '/'))
    .filter(file => !/^(dist|public|tests)\//.test(file))
    .map(file => [file, readFileSync(join(client, file), 'utf8')] as const);

  test('only the module loaded on demand imports it', () => {
    const importers = sources.filter(([, text]) => /from ['"]chart\.js/.test(text)).map(([file]) => file);
    expect(importers).toEqual(['library/stats/pieChart.ts']);
  });

  test('which is only ever imported dynamically', () => {
    const statics = sources.filter(([, text]) => /from ['"].*pieChart/.test(text)).map(([file]) => file);
    expect(statics).toEqual([]);
    expect(readFileSync(join(client, 'library/stats/StatsPanel.tsx'), 'utf8')).toContain("await import('./pieChart')");
  });
});
