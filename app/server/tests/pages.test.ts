// The server, called as browsers call it

import { beforeAll, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { handle } from '../app';
import { STATE_FOLDER_PATH } from '../config';
import { database } from '../db';
import { base, createUser, PASSWORD, prepareTestLibrary, soundBuddyHeaders, USER } from './helpers';

beforeAll(prepareTestLibrary);

describe('pages', () => {
  const browserPost = (path: string, fields: Record<string, string>) =>
    handle(
      new Request(`${base}${path}`, {
        method: 'POST',
        body: new URLSearchParams(fields),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

  const cookieOf = (response: Response) => response.headers.get('set-cookie')?.split(';')[0] ?? '';

  test('welcome lists the users, never their private data', async () => {
    const page = await (await handle(new Request(`${base}/`))).text();
    expect(page).toContain(`/u/${USER}`);
    expect(page).not.toContain(PASSWORD);
    expect(page).not.toContain(`${USER}@example.com`);
  });

  test('the API documentation is one click away : from the welcome page, and the footer of any page', async () => {
    const links = (page: string) => page.split('href="/api/docs"').length - 1;
    expect(links(await (await handle(new Request(`${base}/`))).text())).toBe(2);
    expect(links(await (await handle(new Request(`${base}/account`))).text())).toBe(1);
    expect(links(await (await handle(new Request(`${base}/u/${USER}`))).text())).toBe(1);
  });

  test('the library page', async () => {
    const response = await handle(new Request(`${base}/u/${USER.toUpperCase()}`));
    const page = await response.text();
    expect(response.headers.get('content-type')).toStartWith('text/html');
    expect(page).toContain('id="library"');
    expect(page).toContain(`"shoutStreamUrl":"/u/${USER}/shouts"`);
  });

  test('a user without library gets the upload form', async () => {
    await createUser('emptyuser');
    expect(await (await handle(new Request(`${base}/u/emptyuser`))).text()).toContain('name="SoundVitrine_file"');
  });

  const accountPost = (path: string, fields: Record<string, string> = {}, headers: Record<string, string> = {}, client?: string) =>
    handle(
      new Request(`${base}${path}`, {
        method: 'POST',
        body: JSON.stringify(fields),
        headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en', ...headers },
      }),
      client,
    );

  const meOf = async (cookie: string) =>
    (await (await handle(new Request(`${base}/account/me`, { headers: { cookie } }))).json()) as { username: string | null };

  test('login, then who is logged', async () => {
    const refused = await accountPost('/account/login', { username: USER, password: 'wrong' });
    expect(refused.status).toBe(401);
    // nothing is being uploaded here, unlike where the same check serves SoundBuddy
    expect(await refused.json()).toEqual({ error: 'Wrong password.' });

    const logged = await accountPost('/account/login', { username: USER, password: PASSWORD });
    expect(logged.status).toBe(200);
    expect((await meOf(cookieOf(logged))).username).toBe(USER);
  });

  test('nobody is logged without a session, or with a tampered one', async () => {
    const logged = await accountPost('/account/login', { username: USER, password: PASSWORD });
    const [payload] = cookieOf(logged).split('.');
    expect((await meOf('')).username).toBeNull();
    expect((await meOf(`${payload}.forged`)).username).toBeNull();
  });

  test('the account page is what the browser renders', async () => {
    for (const path of ['/account', '/account/create']) {
      const page = await (await handle(new Request(`${base}${path}`))).text();
      expect(page).toContain('<div id="account"');
      expect(page).toContain('const i18n =');
    }
  });

  test('passwords are stored hashed', () => {
    const { password } = database.query<{ password: string }, []>('SELECT password FROM account LIMIT 1').get() as { password: string };
    expect(password).not.toBe(PASSWORD);
    expect(password.length).toBeGreaterThan(50);
  });

  test('logging out ends the session in the database, not only in the browser', async () => {
    const logged = await accountPost('/account/login', { username: USER, password: PASSWORD });
    const cookie = cookieOf(logged);
    await accountPost('/account/disconnect', {}, { cookie });
    expect((await meOf(cookie)).username).toBeNull();
  });

  test('too many failures block that client on that account, even with the right password', async () => {
    await createUser('guessed1');
    const post = (password: string, client: string) => accountPost('/account/login', { username: 'guessed1', password }, {}, client);

    for (let i = 0; i < 10; i++) expect((await post('wrong', '10.0.0.1')).status).toBe(401);
    expect((await post(PASSWORD, '10.0.0.1')).status).toBe(429);

    expect((await post(PASSWORD, '10.0.0.2')).status).toBe(200);
  });

  test('SoundBuddy gets a 429 when blocked, which does not make it give up', async () => {
    await createUser('guessed2');
    const check = (password: string) => {
      const body = new FormData();
      body.set('username', 'guessed2');
      body.set('password', password);
      return handle(new Request(`${base}/hb/creds`, { method: 'POST', body, headers: soundBuddyHeaders }), '10.0.0.3');
    };

    for (let i = 0; i < 10; i++) expect((await check('wrong')).status).toBe(403);
    expect((await check(PASSWORD)).status).toBe(429);
  });

  test('an email cannot serve two accounts', async () => {
    const taken = await accountPost('/account/create', { username: 'secondcurator', password: PASSWORD, email: `${USER}@example.com` });
    expect(taken.status).toBe(400);
  });

  test('account creation', async () => {
    const tooShort = await accountPost('/account/create', { username: 'abc', password: PASSWORD, email: 'a@example.com' });
    expect(tooShort.status).toBe(400);

    const created = await accountPost('/account/create', { username: 'NewCurator', password: PASSWORD, email: 'a@example.com' });
    expect(created.status).toBe(200);
    expect((await meOf(cookieOf(created))).username).toBe('newcurator');

    const again = await accountPost('/account/create', { username: 'newcurator', password: PASSWORD, email: 'a@example.com' });
    expect(again.status).toBe(400);
  });

  test('the band colors only take colors', async () => {
    const logged = await accountPost('/account/login', { username: USER, password: PASSWORD });
    const post = (body: unknown) =>
      handle(new Request(`${base}/account/colors`, { method: 'POST', body: JSON.stringify(body), headers: { cookie: cookieOf(logged) } }));

    expect(await (await post(['#000000', '#111111', '#222222', '#333333'])).text()).toBe('OK');
    expect(await (await post(['</style><script>', '#111111', '#222222', '#333333'])).text()).toBe('');
  });

  test('the language chosen in the footer sticks', async () => {
    const chosen = await browserPost('/account', { set_lang: 'fr' });
    expect(chosen.status).toBe(303);
    const page = await handle(new Request(`${base}/account`, { headers: { cookie: cookieOf(chosen), 'Accept-Language': 'en' } }));
    expect(await page.text()).toContain('<html lang="fr">');
  });

  test('state files stay out of reach', async () => {
    for (const path of [
      '/data/users/..%2fsoundvitrine.db',
      '/data/users/%2e%2e/session.key',
      '/public/..%2fmain.ts',
      '/public/..%2f..%2fserver/app.ts',
    ]) {
      const response = await handle(new Request(`${base}${path}`));
      expect(await response.text()).not.toContain(PASSWORD);
      expect(response.status).toBe(404);
    }
    expect(existsSync(join(STATE_FOLDER_PATH, 'soundvitrine.db'))).toBe(true);
  });

  test('health check, and unknown pages', async () => {
    expect(await (await handle(new Request(`${base}/healthz`))).text()).toBe('OK');
    expect((await handle(new Request(`${base}/nothing`))).status).toBe(404);
  });
});
