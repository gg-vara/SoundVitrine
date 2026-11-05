import { describe, expect, test } from 'bun:test';
import { createScrollDirection, createScrollSpeed, headerClasses } from '../shell/header';

describe('the speed of scrolling', () => {
  test('is unknown on the first event', () => {
    expect(createScrollSpeed()(500, 0)).toBe(0);
  });

  test('is how far the page went, either way', () => {
    const speedAt = createScrollSpeed();
    speedAt(500, 0);
    expect(speedAt(520, 30)).toBe(20);
    expect(speedAt(505, 60)).toBe(-15);
  });

  test('starts over after a rest', () => {
    const speedAt = createScrollSpeed();
    speedAt(500, 0);
    expect(speedAt(1000, 100)).toBe(0);
    expect(speedAt(1020, 130)).toBe(20);
  });
});

describe('the direction of scrolling', () => {
  test('from the top', () => {
    expect(createScrollDirection()(20)).toBe('down');
  });

  test('compares to the last position it was asked about', () => {
    const directionFrom = createScrollDirection();
    directionFrom(500);
    expect(directionFrom(400)).toBe('up');
    expect(directionFrom(450)).toBe('down');
  });

  test('is up when the page did not move', () => {
    const directionFrom = createScrollDirection();
    directionFrom(500);
    expect(directionFrom(500)).toBe('up');
  });
});

describe('the header', () => {
  const going = { direction: 'down', searching: false, sticky: false, outOfReach: true } as const;

  test('follows when going up', () => {
    expect(headerClasses({ ...going, direction: 'up' })).toBe('sticky');
  });

  test('stays in place near the top', () => {
    expect(headerClasses({ ...going, outOfReach: false })).toBe('');
    expect(headerClasses({ ...going, outOfReach: false, sticky: true })).toBe('');
  });

  test('goes away when going down', () => {
    expect(headerClasses(going)).toBe('toHide');
  });

  test('slides away when it was following', () => {
    expect(headerClasses({ ...going, sticky: true })).toBe('sticky toHide');
  });

  test('stays while searching', () => {
    expect(headerClasses({ ...going, searching: true })).toBe('sticky');
  });
});
