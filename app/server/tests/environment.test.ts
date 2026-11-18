// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The environment the server starts with (server/config.ts), and the client's address it gives (to limit password guessing)

import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { clientIpOf } from '../app';

// the configuration, loaded by a Bun of its own : it is read once, at import
function startWith(environment: Record<string, string>) {
  const loaded = Bun.spawnSync(['bun', '-e', `await import(${JSON.stringify(join(import.meta.dir, '../config.ts'))})`], {
    env: { PATH: process.env.PATH ?? '', ...environment },
  });
  return { ok: loaded.exitCode === 0, error: loaded.stderr.toString() };
}

describe('the environment', () => {
  test('in production, the public address is required', () => {
    const started = startWith({ NODE_ENV: 'production' });
    expect(started.ok).toBe(false);
    expect(started.error).toContain('SOUNDVITRINE_PUBLIC_URL');
  });

  test('SOUNDVITRINE_TRUST_PROXY is refused, telling what replaces it', () => {
    const started = startWith({ SOUNDVITRINE_TRUST_PROXY: '1' });
    expect(started.ok).toBe(false);
    expect(started.error).toContain('SOUNDVITRINE_CLIENT_IP_HEADER');
  });

  test('the client address header is a header name', () => {
    expect(startWith({ SOUNDVITRINE_CLIENT_IP_HEADER: 'cf connecting ip' }).ok).toBe(false);
    expect(startWith({ SOUNDVITRINE_CLIENT_IP_HEADER: 'CF-Connecting-IP' }).ok).toBe(true);
  });
});

describe("the client's address", () => {
  const request = (headers: Record<string, string>) => new Request('http://localhost/', { headers });

  test('without a header named, the direct connection, whatever the request claims', () => {
    expect(clientIpOf(request({ 'x-forwarded-for': '203.0.113.9' }), '10.0.0.2', undefined)).toBe('10.0.0.2');
  });

  test('the header named, as Cloudflare gives it', () => {
    expect(clientIpOf(request({ 'cf-connecting-ip': '203.0.113.9' }), '10.0.0.2', 'cf-connecting-ip')).toBe('203.0.113.9');
  });

  test('of a list, the entry the nearest proxy appended', () => {
    const forwarded = request({ 'x-forwarded-for': '198.51.100.1, 203.0.113.9' });
    expect(clientIpOf(forwarded, '10.0.0.2', 'x-forwarded-for')).toBe('203.0.113.9');
  });

  test('the header missing, the direct connection', () => {
    expect(clientIpOf(request({}), '10.0.0.2', 'cf-connecting-ip')).toBe('10.0.0.2');
  });
});
