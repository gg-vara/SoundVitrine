import { describe, expect, test } from 'bun:test';
import { humanizedDate } from '../library/humanizedDate';

const NOW = new Date('2026-11-06T12:00:00Z');
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const since = (milliseconds: number, language = 'en') => humanizedDate(new Date(NOW.getTime() - milliseconds).toISOString(), NOW, language);

describe('how long ago', () => {
  test('all that is recent is one group', () => {
    expect(since(0)).toBe('now');
    expect(since(44 * SECOND)).toBe('now');
  });

  test('moves to the next unit at the thresholds of moment.js', () => {
    expect(since(45 * SECOND)).toBe('1 minute ago');
    expect(since(44 * MINUTE)).toBe('44 minutes ago');
    expect(since(45 * MINUTE)).toBe('1 hour ago');
    expect(since(21 * HOUR)).toBe('21 hours ago');
    expect(since(22 * HOUR)).toBe('1 day ago');
    expect(since(25 * DAY)).toBe('25 days ago');
    expect(since(26 * DAY)).toBe('1 month ago');
    expect(since(100 * DAY)).toBe('3 months ago');
    expect(since(330 * DAY)).toBe('1 year ago');
    expect(since(1000 * DAY)).toBe('3 years ago');
  });

  test('never says yesterday nor last year', () => {
    expect(since(DAY)).toBe('1 day ago');
    expect(since(400 * DAY)).toBe('1 year ago');
  });

  test('in the language of the page', () => {
    expect(since(0, 'fr')).toBe('maintenant');
    expect(since(2 * 365 * DAY, 'fr')).toBe('il y a 2 ans');
  });

  test('can be ahead', () => {
    expect(since(-5 * DAY)).toBe('in 5 days');
  });

  test('says nothing of what is no date', () => {
    expect(humanizedDate('', NOW, 'en')).toBe('');
    expect(humanizedDate('not a date', NOW, 'en')).toBe('');
  });
});
