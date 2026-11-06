import { describe, expect, test } from 'bun:test';
import { nextPanel, swipeOf } from '../shell/navigation';

describe('the next panel', () => {
  test('with no direction, goes from one to the other', () => {
    expect(nextPanel(0, undefined, 2)).toBe(1);
    expect(nextPanel(1, undefined, 2)).toBe(0);
  });

  test('swiped left, is on the right', () => {
    expect(nextPanel(0, 'left', 2)).toBe(1);
  });

  test('swiped right, is on the left', () => {
    expect(nextPanel(1, 'right', 2)).toBe(0);
  });

  test('there is none past the ends', () => {
    expect(nextPanel(1, 'left', 2)).toBeNull();
    expect(nextPanel(0, 'right', 2)).toBeNull();
  });

  test('alone, there is nowhere to go', () => {
    expect(nextPanel(0, undefined, 1)).toBeNull();
  });
});

describe('a swipe', () => {
  test('goes the way the finger went', () => {
    expect(swipeOf(-100, 5, 100)).toBe('left');
    expect(swipeOf(100, 5, 100)).toBe('right');
  });

  test('is not what scrolls', () => {
    expect(swipeOf(50, 100, 100)).toBeNull();
  });

  test('is not a slow move, nor a tiny one', () => {
    expect(swipeOf(100, 0, 1000)).toBeNull();
    expect(swipeOf(5, 0, 1)).toBeNull();
  });
});
