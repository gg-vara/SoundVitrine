// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// A text of the page's language, with its "%s" and "%d" filled in order
export function filled(text: string | undefined, ...values: (string | number)[]): string {
  let next = 0;
  return (text ?? '').replace(/%[sd]/g, () => String(values[next++]));
}
