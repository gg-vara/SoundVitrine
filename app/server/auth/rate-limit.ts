// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Limits password guessing : too many failures of a client on an account block that client from trying it for a while.
// By client and account, as blocking the account itself would let anyone cut a user off.
// In memory : a restart forgets them, which is fine for a single server

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED = 100_000;

interface Failures {
  count: number;
  resetAt: number;
}

const failures = new Map<string, Failures>();

const keyOf = (clientIp: string, username: string) => `${clientIp}|${username}`;

function forgetExpired(now: number) {
  for (const [key, entry] of failures) if (entry.resetAt <= now) failures.delete(key);
}

export function isBlocked(clientIp: string, username: string, now = Date.now()): boolean {
  const entry = failures.get(keyOf(clientIp, username));
  return entry !== undefined && entry.resetAt > now && entry.count >= MAX_FAILURES;
}

export function recordFailure(clientIp: string, username: string, now = Date.now()) {
  if (failures.size >= MAX_TRACKED) forgetExpired(now);

  const key = keyOf(clientIp, username);
  const entry = failures.get(key);
  if (entry && entry.resetAt > now) entry.count += 1;
  else failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
}

export function clearFailures(clientIp: string, username: string) {
  failures.delete(keyOf(clientIp, username));
}
