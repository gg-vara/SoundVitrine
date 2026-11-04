// The tests keep to their own state folder, and never touch a real one

import { afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const state = mkdtempSync(join(tmpdir(), 'soundvitrine-tests-'));
process.env.SOUNDVITRINE_STATE_PATH = state;

afterAll(() => rmSync(state, { recursive: true, force: true }));
