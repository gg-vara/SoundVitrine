import { describe, expect, test } from 'bun:test';
import { nextPanel } from '../shell/navigation';

const LEFT = 2;
const RIGHT = 4;

describe('the next panel', () => {
  test('with no direction, goes from one to the other', () => {
    expect(nextPanel(0, undefined, 2)).toBe(1);
    expect(nextPanel(1, undefined, 2)).toBe(0);
  });

  test('swiped left, is on the right', () => {
    expect(nextPanel(0, LEFT, 2)).toBe(1);
  });

  test('swiped right, is on the left', () => {
    expect(nextPanel(1, RIGHT, 2)).toBe(0);
  });

  test('there is none past the ends', () => {
    expect(nextPanel(1, LEFT, 2)).toBeNull();
    expect(nextPanel(0, RIGHT, 2)).toBeNull();
  });

  test('another direction moves nothing', () => {
    expect(nextPanel(0, 8, 2)).toBeNull();
  });

  test('alone, there is nowhere to go', () => {
    expect(nextPanel(0, undefined, 1)).toBeNull();
  });
});
