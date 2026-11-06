import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Glob } from 'bun';

const ASSETS = join(import.meta.dir, '..', '..', 'client', 'legacy');

// what parses a string as HTML, or runs it
const RAW_HTML = /\.(innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML|document\.write/;

// never given what users upload
const ALLOWED_IN_VITE: Record<string, string> = {
  'shell/accountPanel.ts': "this server's own pages, which escape what they show",
};

describe('browser scripts', () => {
  // names of tracks, albums, artists and genres come from what any account uploads, and run in its visitors' browsers
  test('uploaded values are not written as HTML', () => {
    const offenders = [...new Glob('**/*.js').scanSync(ASSETS)]
      .map(file => file.replaceAll('\\', '/'))
      .flatMap(file =>
        readFileSync(join(ASSETS, file), 'utf8')
          .split('\n')
          .flatMap((line, index) => (RAW_HTML.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [])),
      );
    expect(offenders).toEqual([]);
  });

  test('nor in what moved to Vite', () => {
    const client = join(ASSETS, '..');
    const offenders = [...new Glob('**/*.{ts,tsx}').scanSync(client)]
      .map(file => file.replaceAll('\\', '/'))
      .filter(file => !(file in ALLOWED_IN_VITE))
      .filter(file => /innerHTML|outerHTML/.test(readFileSync(join(client, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
