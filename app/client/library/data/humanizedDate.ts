// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// "3 years ago", at the same thresholds as moment.js had here : the feed groups albums by this text, so a coarse one is wanted
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30.4375 * DAY;
const YEAR = 365.25 * DAY;

// 0 seconds being "now"
export function roundedElapsed(milliseconds: number): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const within = (unit: number) => Math.round(milliseconds / unit);

  if (within(SECOND) < 45) return { value: 0, unit: 'second' };
  if (within(MINUTE) <= 1) return { value: 1, unit: 'minute' };
  if (within(MINUTE) < 45) return { value: within(MINUTE), unit: 'minute' };
  if (within(HOUR) <= 1) return { value: 1, unit: 'hour' };
  if (within(HOUR) < 22) return { value: within(HOUR), unit: 'hour' };
  if (within(DAY) <= 1) return { value: 1, unit: 'day' };
  if (within(DAY) < 26) return { value: within(DAY), unit: 'day' };
  if (within(MONTH) <= 1) return { value: 1, unit: 'month' };
  if (within(MONTH) < 11) return { value: within(MONTH), unit: 'month' };
  if (within(YEAR) <= 1) return { value: 1, unit: 'year' };
  return { value: within(YEAR), unit: 'year' };
}

// nothing for what is no date
export function humanizedDate(date: string, now: Date, language: string): string {
  const elapsed = now.getTime() - Date.parse(date);
  if (Number.isNaN(elapsed)) return '';

  const { value, unit } = roundedElapsed(Math.abs(elapsed));
  // "auto" would also say "yesterday" and "last year", which are not what these are
  if (value === 0) return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(0, unit);
  return new Intl.RelativeTimeFormat(language).format(elapsed < 0 ? value : -value, unit);
}
