import { describe, expect, test } from 'bun:test';
import { longestTransitionMs } from '../shell/transitions';

describe('how long transitions last', () => {
  test('in seconds or milliseconds', () => {
    expect(longestTransitionMs('0.5s', '0s')).toBe(500);
    expect(longestTransitionMs('200ms', '0s')).toBe(200);
  });

  test('the longest, with its delay', () => {
    expect(longestTransitionMs('0.5s, 0.2s', '0s, 1s')).toBe(1200);
  });

  test('delays repeat when fewer than durations', () => {
    expect(longestTransitionMs('0.1s, 0.2s, 0.3s', '1s')).toBe(1300);
  });

  test('nothing lasts nothing', () => {
    expect(longestTransitionMs('0s', '0s')).toBe(0);
  });
});
