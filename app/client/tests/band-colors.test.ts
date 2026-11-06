import { describe, expect, test } from 'bun:test';
import { bandRule } from '../account/bandColors';

describe("the band's colors", () => {
  test("apply to that user's band", () => {
    expect(bandRule('someone', ['#000000', '#ffffff'])).toBe(
      '.band[data-owner="someone"]::after { background:linear-gradient(-45deg, #000000,#ffffff) !important; }',
    );
  });
});
