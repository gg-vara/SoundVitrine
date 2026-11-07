// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The tests keep to their own state folder, and never touch a real one

import { afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const state = mkdtempSync(join(tmpdir(), 'soundvitrine-tests-'));
process.env.SOUNDVITRINE_STATE_PATH = state;

afterAll(() => {
  // the database may still be open, which Windows refuses to remove : it stays in the temporary folder then
  try {
    rmSync(state, { recursive: true, force: true });
  } catch {}
});
