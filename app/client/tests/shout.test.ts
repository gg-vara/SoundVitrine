import { describe, expect, test } from 'bun:test';
import {
  changedFields,
  elapsedSince,
  isNewTrack,
  isNoMusic,
  isShout,
  isWorthDisplaying,
  metaText,
  movesTimeline,
  type Shout,
} from '../library/shout/logic';

const playing: Shout = { date: '2026-01-01T00:00:00Z', duration: 200, playerPositionMS: 100_000, playerState: true };
const elapsed = (milliseconds: number) => () => milliseconds;

test('a shout is an object, whatever was uploaded', () => {
  expect(isShout({ name: 'a' })).toBe(true);
  for (const value of [null, 'a', 1, [], undefined]) expect(isShout(value)).toBe(false);
});

describe('worth displaying', () => {
  test('a track still going on', () => {
    expect(isWorthDisplaying(playing, elapsed(99_000))).toBe(true);
  });

  test('a track that must have ended', () => {
    expect(isWorthDisplaying(playing, elapsed(100_000))).toBe(false);
  });

  test('a paused track, however old', () => {
    expect(isWorthDisplaying({ ...playing, playerState: false }, elapsed(10_000_000))).toBe(true);
  });

  test('without a length or a date', () => {
    expect(isWorthDisplaying({ date: playing.date }, elapsed(0))).toBe(false);
    expect(isWorthDisplaying({ duration: 200, playerState: true }, elapsed(0))).toBe(false);
  });

  test('of other types than expected, as anyone can upload', () => {
    expect(isWorthDisplaying({ ...playing, duration: '200' } as unknown as Shout, elapsed(0))).toBe(false);
  });
});

describe('changes', () => {
  test('lists what differs, including what went missing', () => {
    expect(changedFields({ name: 'a', album: 'b' }, { name: 'a', artist: 'c' }).sort()).toEqual(['album', 'artist']);
  });

  test('a new track', () => {
    expect(isNewTrack(['name'])).toBe(true);
    expect(isNewTrack(['date', 'playerState'])).toBe(false);
  });

  test('what moves the timeline', () => {
    expect(movesTimeline(['playerState'])).toBe(true);
    expect(movesTimeline(['name'])).toBe(false);
  });

  test('nothing playing anymore', () => {
    expect(isNoMusic({ date: playing.date })).toBe(true);
    expect(isNoMusic(playing)).toBe(false);
  });
});

describe('meta', () => {
  test('artist, album and year', () => {
    expect(metaText({ artist: 'a', album: 'b', year: 1999 })).toBe('a - b (1999)');
    expect(metaText({ artist: 'a', album: 'b' })).toBe('a - b');
  });

  test('needs both the artist and the album', () => {
    expect(metaText({ artist: 'a' })).toBe('');
  });
});

describe('the time since a shout', () => {
  test('counts from its date, in UTC', () => {
    expect(elapsedSince('2026-01-01T00:00:00Z', Date.UTC(2026, 0, 1, 0, 0, 5))).toBe(5000);
  });

  test('is negative when the date is ahead', () => {
    expect(elapsedSince('2026-01-01T00:00:05Z', Date.UTC(2026, 0, 1))).toBe(-5000);
  });
});
