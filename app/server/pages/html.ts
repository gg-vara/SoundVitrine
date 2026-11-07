// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// HTML templates : html`...` escapes what it interpolates, but other templates, raw() and lists of them

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export class Html {
  constructor(readonly value: string) {}

  toString() {
    return this.value;
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, character => ESCAPES[character] ?? character);
}

// trusted HTML, as is
export function raw(value: string): Html {
  return new Html(value);
}

type Interpolated = Html | string | number | boolean | null | undefined | Interpolated[];

function render(value: Interpolated): string {
  if (value instanceof Html) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: Interpolated[]): Html {
  return new Html(strings.reduce((result, string, index) => result + string + (index < values.length ? render(values[index]) : ''), ''));
}
