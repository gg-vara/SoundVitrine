// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Glob } from 'bun';

const CLIENT = join(import.meta.dir, '..', '..', 'client');

describe('browser scripts', () => {
  // names of tracks, albums, artists and genres come from what any account uploads, and run in its visitors' browsers
  test('uploaded values are not written as HTML', () => {
    const offenders = [...new Glob('**/*.{ts,tsx}').scanSync(CLIENT)]
      .map(file => file.replaceAll('\\', '/'))
      .filter(file => /innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(readFileSync(join(CLIENT, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
