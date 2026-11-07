// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, test } from 'bun:test';
import { coverInAnswer, coverSearchUrl } from '../library/cover/search';
import { youtubeSearchUrl } from '../library/youtube';

describe('searching a cover', () => {
  test('asks for an album of an artist, in lowercase', () => {
    expect(decodeURIComponent(coverSearchUrl('Back In Black', 'AC/DC').split('query=')[1] ?? '')).toBe(
      'release:back in black AND artist:ac/dc',
    );
  });

  test('does not let an album end the query', () => {
    const url = new URL(coverSearchUrl('Rock & Roll #1', 'Someone'));
    expect(url.searchParams.get('query')).toBe('release:rock & roll #1 AND artist:someone');
    expect(url.searchParams.get('fmt')).toBe('json');
  });

  test('gives the first release group found', () => {
    expect(coverInAnswer(JSON.stringify({ 'release-groups': [{ id: 'abc' }, { id: 'def' }] }))).toBe(
      'https://coverartarchive.org/release-group/abc/front-250',
    );
  });

  test('finds nothing in an empty, failed or unreadable answer', () => {
    expect(coverInAnswer(JSON.stringify({ 'release-groups': [] }))).toBeUndefined();
    expect(coverInAnswer(JSON.stringify({ error: 'Your requests are exceeding the allowable rate limit' }))).toBeUndefined();
    expect(coverInAnswer('<html>Bad gateway</html>')).toBeUndefined();
    expect(coverInAnswer('')).toBeUndefined();
  });
});

describe('a YouTube search', () => {
  test('is in lowercase, with plus signs between words', () => {
    expect(youtubeSearchUrl('AC/DC', 'Back In Black')).toBe('https://www.youtube.com/results?search_query=ac%2Fdc+back+in+black');
  });

  test('has no double spaces', () => {
    expect(youtubeSearchUrl('Someone ', 'Song')).toBe('https://www.youtube.com/results?search_query=someone+song');
  });
});
