// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What an application asking for access shows in the browser : at /oauth, mounted by server/app.ts, where Better Auth sends the user
// (loginPage, consentPage in server/auth/auth.ts). Their forms post here, which calls Better Auth on the server

import { APIError } from 'better-auth/api';
import { Hono } from 'hono';
import { signIn } from './account';
import { auth } from './auth/auth';
import type { Scope } from './auth/scopes';
import { SCOPE_NAMES } from './auth/scopes';
import type { AppContext, Env } from './env';
import { plain } from './env';
import { oauthConsentPage, oauthLoginPage } from './pages/oauth';

export const oauthRoutes = new Hono<Env>();

// the authorization's query, as Better Auth signed it : from the page's own address, else from its form
const oauthQueryOf = (c: AppContext) => c.var.page.form.oauth_query ?? new URL(c.req.url).search.slice(1);

async function clientNameOf(clientId: string | null): Promise<string | undefined> {
  if (!clientId) return undefined;
  const { adapter } = await auth.$context;
  const client = await adapter.findOne<{ name?: string }>({ model: 'oauthClient', where: [{ field: 'clientId', value: clientId }] });
  return client ? (client.name ?? clientId) : undefined;
}

async function loginPage(c: AppContext, refusal?: { text: string; status: 400 | 401 | 429 }, username?: string) {
  const oauthQuery = oauthQueryOf(c);
  const clientName = await clientNameOf(new URLSearchParams(oauthQuery).get('client_id'));
  if (!clientName) return plain(c, c.var.tr('oauth_unknown_client'), 400);

  if (refusal) c.status(refusal.status);
  return c.render(oauthLoginPage(c.var.page, { clientName, oauthQuery, username, refusal: refusal?.text }));
}

oauthRoutes.get('/login', c => loginPage(c));

oauthRoutes.post('/login', async c => {
  const { form } = c.var.page;
  const result = await signIn(c, form.username ?? '', form.password ?? '', oauthQueryOf(c)).catch(error => {
    // a query not signed by Better Auth, or expired
    if (error instanceof APIError) return { refusal: error.message, status: 400 as const };
    throw error;
  });

  if (result.refusal !== null) return loginPage(c, { text: result.refusal, status: result.status as 400 | 401 | 429 }, form.username);
  return c.redirect(result.redirect ?? '/', 303);
});

oauthRoutes.get('/consent', async c => {
  const username = c.var.page.session.loggedAs;
  if (!username) return loginPage(c);

  const oauthQuery = oauthQueryOf(c);
  const query = new URLSearchParams(oauthQuery);
  const clientName = await clientNameOf(query.get('client_id'));
  if (!clientName) return plain(c, c.var.tr('oauth_unknown_client'), 400);

  const asked = (query.get('scope') ?? '').split(' ');
  const scopes = SCOPE_NAMES.filter((scope: Scope) => asked.includes(scope));
  return c.render(oauthConsentPage(c.var.page, { clientName, scopes, oauthQuery, username }));
});

oauthRoutes.post('/consent', async c => {
  const { form } = c.var.page;
  try {
    const response = (await auth.api.oauth2Consent({
      body: { accept: form.accept === 'true', oauth_query: oauthQueryOf(c) },
      headers: c.req.raw.headers,
    })) as { url?: string };
    // back to the application, with the code, or with access_denied
    return response.url ? c.redirect(response.url, 303) : plain(c, '', 400);
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    return plain(c, error.message, 400);
  }
});
