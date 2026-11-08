// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The tests keep to their own state folder, and never touch a real one

import { afterAll } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// the server imports what Vite's build lists : built once if it never was, tests do not depend on doing it
if (!existsSync(join(import.meta.dir, '../embedded.ts'))) {
  const build = Bun.spawnSync(['bun', 'x', 'vite', 'build'], { cwd: join(import.meta.dir, '../..'), stdout: 'ignore', stderr: 'inherit' });
  if (build.exitCode !== 0) throw new Error('The browser build failed');
}

const state = mkdtempSync(join(tmpdir(), 'soundvitrine-tests-'));
process.env.SOUNDVITRINE_STATE_PATH = state;

afterAll(() => {
  // the database may still be open, which Windows refuses to remove : it stays in the temporary folder then
  try {
    rmSync(state, { recursive: true, force: true });
  } catch {}
});
