// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import type { Page } from '@playwright/test';
import {
  discover,
  expect,
  expectClosed,
  expectOpen,
  logOut,
  OPEN,
  openAccountPanel,
  openBand,
  openLibrary,
  PASSWORD,
  pictureFile,
  submitLogin,
  test,
  USER,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await openLibrary(page);
});

test('shows what is playing', async ({ page }) => {
  const shout = page.locator('#shoutContainer');
  await expect(shout.getByText('Track 1 é')).toBeVisible();
  await expect(shout.locator('a').first()).toHaveAttribute('href', /youtube\.com.*ac%2Fdc\+track/);
  await expectOpen(page, '#shoutContainer');
});

test('browses down to an album', async ({ page }) => {
  const panel = discover(page);
  await panel.getByText('Rock', { exact: true }).click();
  await panel.getByText('Sigur Rós', { exact: true }).click();
  await panel.getByText('Album 0 of Sigur Rós', { exact: true }).click();

  await expect(panel.getByText('1970', { exact: true })).toBeVisible();
  await expect(panel.getByText('Track 0 é')).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Listen to the Album' })).toHaveAttribute('href', /youtube\.com.*sigur/);
  await expect(panel.getByText(/years? ago/)).toBeVisible();
});

test('finds an artist in any script, and goes to it', async ({ page }) => {
  await page.getByPlaceholder('Search a band name...').fill('bjork');
  const result = page.getByRole('button', { name: /Björk/ });
  await expect(result).toBeVisible();
  await result.dispatchEvent('mousedown');
  await expect(discover(page).getByText('Album 12 of Björk', { exact: true })).toBeVisible();
});

test('opens the feed, the profile and the statistics', async ({ page }) => {
  await page.getByTitle('Feed', { exact: true }).click();
  await expectOpen(page, '#feedContainer');
  await expect(
    page
      .locator('#feedContainer')
      .getByText(/\d+ years ago/)
      .first(),
  ).toBeVisible();
  await page.getByTitle('Feed', { exact: true }).click();
  await expectClosed(page, '#feedContainer');

  await page.getByTitle(`${USER} | Profile`).click();
  await expectOpen(page, '#profileContainer');
  await page.getByTitle(`${USER} | Profile`).click();
  await expectClosed(page, '#profileContainer');

  await page.getByTitle('Statistics', { exact: true }).click();
  await expectOpen(page, '#statsContainer');
  await expect(page.locator('#statsContainer canvas')).toHaveCount(2);
});

test('the header stays while the page scrolls', async ({ page }) => {
  await page.getByTitle('Feed', { exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(2000);

  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
  await expect.poll(() => page.evaluate(() => document.querySelector('header')?.getBoundingClientRect().top)).toBe(0);
});

test('tells when the library fails to load, and retries', async ({ page }) => {
  let failing = true;
  await page.route('**/unified.json', route => (failing ? route.fulfill({ status: 500 }) : route.fallback()));
  await page.goto(`/u/${USER}`);

  const retry = page.locator('#libraryFailure button');
  await expect(retry).toBeVisible();

  failing = false;
  await retry.click();
  await expect(discover(page).getByText('Rock', { exact: true })).toBeVisible();
  await expect(page.locator('#loader')).toHaveCount(0);
});

test('the account panel : refusal, account creation form, login, logout', async ({ page }) => {
  await openAccountPanel(page);
  const panel = page.locator('#accountContent');
  await expect(panel.getByRole('heading', { name: 'Connect' })).toBeVisible();

  await submitLogin(page, 'wrongpassword');
  const refusal = panel.getByText('Wrong password.');
  await expect(refusal).toBeVisible();
  await refusal.click();
  await expect.poll(() => panel.locator('.popup').evaluate(element => element.clientHeight)).toBe(0);

  await panel.getByRole('button', { name: 'create an account' }).click();
  await expect(panel.getByRole('heading', { name: 'Create account' })).toBeVisible();
  await panel.getByRole('button', { name: /Back/ }).click();
  await expect(panel.getByRole('heading', { name: 'Connect' })).toBeVisible();

  await submitLogin(page, PASSWORD);
  await expect(panel.getByText(`Welcome back, ${USER}`)).toBeVisible();
  await expect(panel.getByTitle('Update your background wave')).toBeVisible();

  const band = await openBand(page);
  await band.getByTitle('Cancel').click();
  await expect(band).not.toHaveClass(OPEN);

  await logOut(page);
});

test('the account panel creates an account', async ({ page }) => {
  await openAccountPanel(page);
  const panel = page.locator('#accountContent');
  await panel.getByRole('button', { name: 'create an account' }).click();
  await expect(panel.getByRole('heading', { name: 'Create account' })).toBeVisible();

  const username = `e2e${Date.now() % 1_000_000_000}`;
  await page.locator('input[name=username]').fill(username);
  await page.locator('input[name=password]').fill(PASSWORD);
  await page.locator('input[name=email]').fill(`${username}@example.com`);
  await page.locator('input[type=submit]').click();

  await expect(panel.getByText(`Welcome back, ${username}`)).toBeVisible();
  await logOut(page);
});

test('going to the account panel and back keeps the page', async ({ page }) => {
  await openAccountPanel(page);
  await expect(page.locator('#accountContent').getByRole('heading', { name: 'Connect' })).toBeVisible();

  await page.locator('#accountPanel').getByTitle('Login / Create an account').click();
  await expect(discover(page).getByText('Rock', { exact: true })).toBeInViewport();
});

test('shows the cover found for an album, or tells there is none', async ({ page }) => {
  const panel = discover(page);
  const cover = panel.locator('.cover');
  await panel.getByText('Rock', { exact: true }).click();
  await panel.getByText('Sigur Rós', { exact: true }).click();
  await panel.getByText('Album 0 of Sigur Rós', { exact: true }).click();
  await expect(cover).toHaveClass(/(^|\s)noCover(\s|$)/);

  await page.route('https://musicbrainz.org/**', route => route.fulfill({ json: { 'release-groups': [{ id: 'found' }] } }));
  await page.route('https://coverartarchive.org/**', route => route.fulfill({ ...pictureFile(), body: pictureFile().buffer }));
  await openLibrary(page);
  await panel.getByText('Rock', { exact: true }).click();
  await panel.getByText('Sigur Rós', { exact: true }).click();
  await panel.getByText('Album 1 of Sigur Rós', { exact: true }).click();
  await expect(cover).not.toHaveClass(/(^|\s)(noCover|searchingCover)(\s|$)/);
  await expect(cover.locator('img')).toHaveAttribute('src', /coverartarchive/);
});

test('closes what it opened, and fits it when the window changes', async ({ page }) => {
  await page.getByTitle('Feed', { exact: true }).click();
  // while it opens : it must not end at the height it was going to
  await page.setViewportSize({ width: 600, height: 700 });
  await expect
    .poll(() => page.locator('#feedContainer').evaluate(element => element.scrollHeight - element.clientHeight))
    .toBeLessThanOrEqual(1);
  await page.getByTitle('Feed', { exact: true }).click();
  await expectClosed(page, '#feedContainer');
  await page.getByTitle('Feed', { exact: true }).click();
  await expectOpen(page, '#feedContainer');
});

test('downloads the background video once the account panel opens, a small copy first, then the full one', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', request => {
    const file = /videos\/(bg[^/?]*)/.exec(request.url())?.[1];
    if (file && !requested.includes(file)) requested.push(file);
  });
  await page.reload();
  await expect(discover(page).getByText('Rock', { exact: true })).toBeVisible();
  expect(requested).toEqual([]);

  await openAccountPanel(page);
  await expect.poll(() => requested).toEqual(['bg-480.webm', 'bg.mp4']);

  const videos = page.locator('#bg video');
  // a browser without H.264 keeps the small one, which plays
  const playsFull = await videos
    .last()
    .evaluate(video => (video as HTMLVideoElement).canPlayType('video/mp4; codecs="avc1.42E01E"') !== '');
  if (playsFull) await expect(videos).toHaveCount(1);
  await expect(videos.first()).toHaveAttribute('src', playsFull ? /bg\.mp4/ : /bg-480\.webm/);
  await expect.poll(() => videos.first().evaluate(video => (video as HTMLVideoElement).paused)).toBe(false);

  await page.locator('#accountPanel').getByTitle('Login / Create an account').click();
  await expect.poll(() => videos.first().evaluate(video => (video as HTMLVideoElement).paused)).toBe(true);
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, viewport: { width: 500, height: 800 } });

  const swipe = (page: Page, fromX: number, toX: number) =>
    page.evaluate(
      async ([from, to]) => {
        const touch = (x: number) => new Touch({ identifier: 1, target: document.body, clientX: x, clientY: 300 });
        const send = (type: string, x: number, touches: Touch[]) =>
          document.body.dispatchEvent(new TouchEvent(type, { touches, changedTouches: [touch(x)], bubbles: true }));
        send('touchstart', from as number, [touch(from as number)]);
        await new Promise(resolve => setTimeout(resolve, 50));
        send('touchend', to as number, []);
      },
      [fromX, toX],
    );

  test('swiping goes from a panel to the other', async ({ page }) => {
    const main = page.locator('main');
    await swipe(page, 400, 100);
    await expect(main).toHaveCSS('transform', /matrix\(1, 0, 0, 1, -\d+/);

    await expect(page.locator('#accountContent').getByRole('heading', { name: 'Connect' })).toBeVisible();
    await swipe(page, 100, 400);
    await expect(main).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  });
});
