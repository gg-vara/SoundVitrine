// Libraries uploaded compressed : MSZIP buffers, as compressed natively on Windows (which has no zlib API), or zlib, gzip and raw deflate data

import { gunzipSync, inflateRawSync, inflateSync } from 'node:zlib';

// signature of the buffers compressed by Windows' Compression API
const MSZIP_BUFFER_MAGIC = Buffer.from([0x0a, 0x51, 0xe5, 0xc0]);

// a raw deflate block may refer to the last 32 KB of output
const DEFLATE_WINDOW = 32768;

// undefined if "data" cannot be decompressed
export function decompressUpload(data: Uint8Array): Buffer | undefined {
  const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (buffer.subarray(0, 4).equals(MSZIP_BUFFER_MAGIC)) return mszipDecode(buffer);

  for (const decode of [inflateSync, gunzipSync, inflateRawSync]) {
    try {
      return decode(buffer);
    } catch {
      // next format
    }
  }
  return undefined;
}

// MSZIP buffer of Windows' Compression API : a 24 bytes header (magic, then uncompressed size at 8, block size at 16),
// followed by blocks of [compressed size, u32]["CK"][raw deflate], each one using the previous block's output as dictionary
export function mszipDecode(data: Buffer): Buffer | undefined {
  if (data.length < 24) return undefined;

  const expectedSize = data.readBigUInt64LE(8);
  const blocks: Buffer[] = [];
  let outputSize = 0n;
  let previous: Buffer | undefined;
  let offset = 24;

  while (offset < data.length) {
    if (offset + 4 > data.length) return undefined;
    const size = data.readUInt32LE(offset);
    offset += 4;

    if (size < 2 || offset + size > data.length || data.toString('latin1', offset, offset + 2) !== 'CK') return undefined;

    let block: Buffer;
    try {
      const compressed = data.subarray(offset + 2, offset + size);
      block = inflateRawSync(compressed, previous ? { dictionary: previous.subarray(-DEFLATE_WINDOW) } : {});
    } catch {
      return undefined;
    }

    blocks.push(block);
    outputSize += BigInt(block.length);
    if (outputSize > expectedSize) return undefined;

    previous = block;
    offset += size;
  }

  return outputSize === expectedSize ? Buffer.concat(blocks) : undefined;
}
