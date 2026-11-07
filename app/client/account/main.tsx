// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Entry of the browser build, on the account page when it is a page of its own
import { render } from '@solidjs/web';
import { AccountPage } from './AccountPage';

render(() => <AccountPage />, document.getElementById('account') as HTMLElement);
