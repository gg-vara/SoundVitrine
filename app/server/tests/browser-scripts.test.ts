import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Glob } from 'bun';

const CLIENT = join(import.meta.dir, '..', '..', 'client');

// never given what users upload
const ALLOWED: Record<string, string> = {
  'shell/accountPanel.ts': "this server's own pages, which escape what they show",
};

describe('browser scripts', () => {
  // names of tracks, albums, artists and genres come from what any account uploads, and run in its visitors' browsers
  test('uploaded values are not written as HTML', () => {
    const offenders = [...new Glob('**/*.{ts,tsx}').scanSync(CLIENT)]
      .map(file => file.replaceAll('\\', '/'))
      .filter(file => !(file in ALLOWED))
      .filter(file => /innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(readFileSync(join(CLIENT, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
