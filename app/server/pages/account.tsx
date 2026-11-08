// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import type { PageContext } from './layout';
import { ACCOUNT_ENTRY, AdminPage, ClientScript, pageTitle, TranslationsScript } from './layout';

// what the browser renders, from GET /account/me (client/account/)
export function accountPage(context: PageContext) {
  const { tr } = context;

  return (
    <AdminPage context={context} title={pageTitle(tr(context.session.loggedAs ? 'e_log_manage' : 'e_log_home'))}>
      <div id="account" class="contents"></div>
      <TranslationsScript lang={context.lang} />
      <ClientScript name={ACCOUNT_ENTRY} />
    </AdminPage>
  );
}
