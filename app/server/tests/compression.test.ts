import { describe, expect, test } from 'bun:test';
import { deflateRawSync, deflateSync, gzipSync } from 'node:zlib';
import { decompressUpload } from '../compression';

// a buffer of Windows' Compression API, its second block compressed against the first one
function mszip(first: string, second: string): Buffer {
  const header = Buffer.alloc(24);
  Buffer.from([0x0a, 0x51, 0xe5, 0xc0]).copy(header);
  header.writeBigUInt64LE(BigInt(first.length + second.length), 8);

  const blocks = [deflateRawSync(first), deflateRawSync(second, { dictionary: Buffer.from(first) })].flatMap(block => {
    const size = Buffer.alloc(4);
    size.writeUInt32LE(block.length + 2);
    return [size, Buffer.from('CK'), block];
  });
  return Buffer.concat([header, ...blocks]);
}

describe('decompressUpload', () => {
  const text = '[{"Name":"Track"}]';

  test.each([
    ['zlib', deflateSync(text)],
    ['gzip', gzipSync(text)],
    ['raw deflate', deflateRawSync(text)],
  ])('%s', (_name, data) => {
    expect(decompressUpload(data)?.toString()).toBe(text);
  });

  test('MSZIP, with blocks depending on the previous one', () => {
    const block = '"Name":"The same words", '.repeat(50);
    expect(decompressUpload(mszip(block, block))?.toString()).toBe(block + block);
  });

  test('refuses what is not compressed, or truncated', () => {
    expect(decompressUpload(Buffer.from('not compressed'))).toBeUndefined();
    const data = mszip('abc', 'def');
    expect(decompressUpload(data.subarray(0, data.length - 3))).toBeUndefined();
  });

  test('refuses a buffer which does not hold its announced size', () => {
    const data = mszip('abc', 'def');
    data.writeBigUInt64LE(5n, 8);
    expect(decompressUpload(data)).toBeUndefined();
  });
});
