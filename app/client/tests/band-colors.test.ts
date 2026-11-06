import { describe, expect, test } from 'bun:test';
import { bandRule, colorsOfGradient } from '../account/bandColors';

describe("the band's colors", () => {
  test('are read from a computed gradient', () => {
    expect(colorsOfGradient('linear-gradient(-45deg, rgb(238, 119, 82), rgb(231, 60, 126), rgb(35, 166, 213), rgb(35, 213, 171))')).toEqual(
      ['#ee7752', '#e73c7e', '#23a6d5', '#23d5ab'],
    );
  });

  test('keep the zeros of small channels', () => {
    expect(colorsOfGradient('linear-gradient(-45deg, rgb(0, 5, 16))')).toEqual(['#000510']);
  });

  test('are found with no space between channels', () => {
    expect(colorsOfGradient('linear-gradient(-45deg,rgb(1,2,3))')).toEqual(['#010203']);
  });

  test('are none without a gradient', () => {
    expect(colorsOfGradient('none')).toEqual([]);
  });

  test("apply to that user's band", () => {
    expect(bandRule('someone', ['#000000', '#ffffff'])).toBe(
      '.wAnim[data-owner="someone"]::after { background:linear-gradient(-45deg, #000000,#ffffff) !important; }',
    );
  });
});
