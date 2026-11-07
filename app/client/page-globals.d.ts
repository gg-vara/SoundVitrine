// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the page's own scripts define as globals

declare const i18n: Record<string, string>;

declare const pageData: {
  user: string;
  profilePicture?: string;
  loggedIn: boolean;
  libraryUrl: string;
  shoutUrl: string;
  shoutStreamUrl: string;
};
