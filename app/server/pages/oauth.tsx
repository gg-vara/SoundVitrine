// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What an application asking for access shows, in the browser (server/oauth.ts) : logging in, then the consent

import type { Scope } from '../auth/scopes';
import { SCOPE_TEXTS } from '../auth/scopes';
import type { PageContext } from './layout';
import { AdminPage, pageTitle } from './layout';

// "oauthQuery" : the authorization's query, as Better Auth signed it, sent back as it is
export function oauthLoginPage(
  context: PageContext,
  page: { clientName: string; oauthQuery: string; username?: string; refusal?: string },
) {
  const { tr } = context;

  return (
    <AdminPage context={context} title={pageTitle(tr('log_in'))}>
      <div class="flex flex-col items-center">
        <h1>{tr('oauth_login', page.clientName)}</h1>
        {page.refusal ? (
          <p role="alert" class="text-[#b00020]">
            {page.refusal}
          </p>
        ) : null}
        <form method="post" action="/oauth/login">
          <input type="hidden" name="oauth_query" value={page.oauthQuery} />
          <input
            class="textInput"
            name="username"
            autocomplete="username"
            placeholder={tr('username')}
            value={page.username ?? ''}
            required
          />
          <input class="textInput" name="password" type="password" autocomplete="current-password" placeholder={tr('password')} required />
          <input class="submitButton" type="submit" value={tr('log_in')} />
        </form>
        <a href="/account">{tr('log_createAccount')}</a>
      </div>
    </AdminPage>
  );
}

export function oauthConsentPage(
  context: PageContext,
  page: { clientName: string; scopes: Scope[]; oauthQuery: string; username: string },
) {
  const { tr } = context;

  return (
    <AdminPage context={context} title={pageTitle(tr('oauth_consent', page.clientName))}>
      <div class="flex flex-col items-center">
        <h1>{tr('oauth_consent', page.clientName)}</h1>
        <ul>
          {page.scopes.map(scope => (
            <li>{tr(SCOPE_TEXTS[scope])}</li>
          ))}
        </ul>
        <p class="text-[.8em] text-[grey]">{tr('oauth_as', page.username)}</p>
        <form method="post" action="/oauth/consent" class="flex gap-[.5em]">
          <input type="hidden" name="oauth_query" value={page.oauthQuery} />
          <button type="submit" name="accept" value="true" class="submitButton">
            {tr('oauth_allow')}
          </button>
          <button type="submit" name="accept" value="false" class="actionButton">
            {tr('oauth_deny')}
          </button>
        </form>
      </div>
    </AdminPage>
  );
}
