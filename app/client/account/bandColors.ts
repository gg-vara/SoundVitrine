// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// over what the server rendered for this user
export const bandRule = (owner: string, colors: string[]) =>
  `.band[data-owner="${owner}"]::after { background:linear-gradient(-45deg, ${colors.join(',')}) !important; }`;
