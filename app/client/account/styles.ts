// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the account forms share. Their states are in components.css
export const LOGIN_RACK = 'm-2 flex flex-col';

export const ACCOUNT_CREATION = 'flex flex-col text-center';

export const ACCOUNT_MANAGEMENT = `${ACCOUNT_CREATION} [&_button:not(:first-child):not(:only-child)]:mt-4 [&>*:not(:first-child):not(:only-child)]:mt-4`;
