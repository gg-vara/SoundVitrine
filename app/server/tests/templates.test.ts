// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The pages the server renders (server/pages), in hono/jsx : what they interpolate is escaped, in text and in attributes

import { describe, expect, test } from 'bun:test';
import { translator } from '../i18n/i18n';
import type { PageContext } from '../pages/layout';
import { scriptJson } from '../pages/layout';
import { welcomePage } from '../pages/welcome';

const HOSTILE = '"><script>alert(1)</script>';

const context: PageContext = {
  request: new Request('http://localhost/'),
  url: new URL('http://localhost/'),
  session: {},
  clientIp: '127.0.0.1',
  lang: 'en',
  tr: translator('en'),
  form: {},
};

describe('templates', () => {
  test('a value in text and in an attribute is escaped', () => {
    const page = String(welcomePage(context, [{ username: HOSTILE, profilePic: HOSTILE, customColors: [] }]));

    expect(page).not.toContain('<script>alert(1)');
    expect(page).not.toContain('"><script>');
    expect(page).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('JSON in a script cannot close it', () => {
    expect(scriptJson({ text: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});
