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
  await expect(page.locator('#loader-container')).toHaveCount(0);
});

test('the account panel : refusal, account creation form, login, logout', async ({ page }) => {
  await openAccountPanel(page);
  const panel = page.locator('#xmlRLoader');
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
  const panel = page.locator('#xmlRLoader');
  await panel.getByRole('button', { name: 'create an account' }).click();
  await expect(panel.getByRole('heading', { name: 'Create account' })).toBeVisible();

  await page.locator('input[name=username]').fill('e2ecurator');
  await page.locator('input[name=password]').fill(PASSWORD);
  await page.locator('input[name=email]').fill('e2e@example.com');
  await page.locator('input[type=submit]').click();

  await expect(panel.getByText('Welcome back, e2ecurator')).toBeVisible();
  await logOut(page);
});

test('going to the account panel and back keeps the page', async ({ page }) => {
  await openAccountPanel(page);
  await expect(page.locator('#xmlRLoader').getByRole('heading', { name: 'Connect' })).toBeVisible();

  await page.locator('#app-connect').getByTitle('Login / Create an account').click();
  await expect(discover(page).getByText('Rock', { exact: true })).toBeInViewport();
});

test('shows the cover found for an album, or tells there is none', async ({ page }) => {
  const panel = discover(page);
  const cover = panel.locator('.imgLoader');
  await panel.getByText('Rock', { exact: true }).click();
  await panel.getByText('Sigur Rós', { exact: true }).click();
  await panel.getByText('Album 0 of Sigur Rós', { exact: true }).click();
  await expect(cover).toHaveClass(/(^|s)noImgFound(s|$)/);

  await page.route('https://musicbrainz.org/**', route => route.fulfill({ json: { 'release-groups': [{ id: 'found' }] } }));
  await page.route('https://coverartarchive.org/**', route => route.fulfill({ ...pictureFile(), body: pictureFile().buffer }));
  await openLibrary(page);
  await panel.getByText('Rock', { exact: true }).click();
  await panel.getByText('Sigur Rós', { exact: true }).click();
  await panel.getByText('Album 1 of Sigur Rós', { exact: true }).click();
  await expect(cover).not.toHaveClass(/(^|s)(noImgFound|searchingCover)(s|$)/);
  await expect(cover.locator('img')).toHaveAttribute('src', /coverartarchive/);
});

test('closes what it opened, and fits it when the window changes', async ({ page }) => {
  await page.getByTitle('Feed', { exact: true }).click();
  await expectOpen(page, '#feedContainer');
  await page.setViewportSize({ width: 600, height: 700 });
  await expect
    .poll(() => page.locator('#feedContainer').evaluate(element => element.scrollHeight - element.clientHeight))
    .toBeLessThanOrEqual(1);
  await page.getByTitle('Feed', { exact: true }).click();
  await expectClosed(page, '#feedContainer');
  await page.getByTitle('Feed', { exact: true }).click();
  await expectOpen(page, '#feedContainer');
});
