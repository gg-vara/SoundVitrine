import type { Html } from './html';
import { html } from './html';
import type { PageContext } from './layout';
import { ACCOUNT_ENTRY, adminPage, clientScript, pageTitle, translationsScript } from './layout';

// what the browser renders, from GET /account/me (client/account/)
export function accountPage(context: PageContext): Html {
  const { tr } = context;
  const content = html`<div id="account" class="contents"></div>${translationsScript(context)}${clientScript(ACCOUNT_ENTRY)}`;
  return adminPage(context, pageTitle(tr(context.session.loggedAs ? 'e_log_manage' : 'e_log_home')), content);
}
