// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the routes taking a library or a shout do with it, whichever way it comes

import { createHash } from 'node:crypto';
import { librarySha1, saveLatestShout, saveLibraryRecord } from '../db';
import { decompressUpload } from '../library/compression';
import { compileLibrary, libraryPath } from '../library/library';
import { publishShout, ShoutSchema } from '../library/shouts';

function asJson(text: string): string | undefined {
  try {
    JSON.parse(text);
    return text;
  } catch {
    return undefined;
  }
}

// the uploaded file as JSON text, decompressed if needed; undefined if not JSON.
// Told from its content : Bun's form parser ignores the Content-Type of a file, and deduces one from its file name
export async function uploadedJson(file: File): Promise<string | undefined> {
  const data = new Uint8Array(await file.arrayBuffer());
  return asJson(Buffer.from(data).toString('utf8')) ?? asJson(decompressUpload(data)?.toString('utf8') ?? '');
}

// keeps the library, unless it is what is already there. "invalid" when it is not JSON
export async function storeLibrary(user: string, file: File): Promise<'invalid' | 'identical' | 'stored'> {
  const json = await uploadedJson(file);
  if (json === undefined) return 'invalid';

  const sha1 = createHash('sha1').update(json).digest('hex');
  if (sha1 === librarySha1(user)) return 'identical';

  await Bun.write(libraryPath(user), json);
  await compileLibrary(user);
  saveLibraryRecord(user, sha1);
  return 'stored';
}

// sent live only if it is one, but kept anyway
export function storeShout(user: string, json: string): boolean {
  const shout = ShoutSchema.safeParse(JSON.parse(json));
  if (shout.success) publishShout(user, shout.data);
  saveLatestShout(user, json);
  return shout.success;
}
