import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Glob } from 'bun';

const ASSETS = join(import.meta.dir, '..', '..', 'client', 'legacy');

// what parses a string as HTML, or runs it
const RAW_HTML = /\.(innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML|document\.write/;

// never given what users upload
const ALLOWED: Record<string, string> = {
  'admin/js/bbEditor.js': 'a style, of a username and colors the server checks',
  'explorer/js/misc/rLoader.js': "this server's own pages, which escape what they show",
};

describe('browser scripts', () => {
  // names of tracks, albums, artists and genres come from what any account uploads, and run in its visitors' browsers
  test('uploaded values are not written as HTML', () => {
    const offenders = [...new Glob('**/*.js').scanSync(ASSETS)]
      .map(file => file.replaceAll('\\', '/'))
      .filter(file => !(file in ALLOWED))
      .flatMap(file =>
        readFileSync(join(ASSETS, file), 'utf8')
          .split('\n')
          .flatMap((line, index) => (RAW_HTML.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [])),
      );
    expect(offenders).toEqual([]);
  });

  test('names reach the charts escaped', () => {
    expect(readFileSync(join(ASSETS, 'explorer/js/app/panels/stats.js'), 'utf8')).toContain('escapeChartText(genreName)');
  });
});
