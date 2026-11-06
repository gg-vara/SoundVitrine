import { test as base, expect, type Page } from '@playwright/test';

export const USER = 'testcurator';
export const PASSWORD = 'testpassword';

// no call to what is outside : covers are asked to MusicBrainz, which answers as if it had none
export const test = base.extend<{ uncaught: string[] }>({
  uncaught: [
    async ({ page }, use) => {
      const uncaught: string[] = [];
      page.on('pageerror', error => uncaught.push(error.message));
      await page.route('https://musicbrainz.org/**', route => route.fulfill({ json: { 'release-groups': [] } }));
      await use(uncaught);
      expect(uncaught).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const discover = (page: Page) => page.locator('#discoverContent');

// what opens under the header is there all along, without any height
export const expectOpen = (page: Page, id: string) =>
  expect.poll(() => page.locator(id).evaluate(element => element.clientHeight)).toBeGreaterThan(50);
export const expectClosed = (page: Page, id: string) =>
  expect.poll(() => page.locator(id).evaluate(element => element.clientHeight)).toBe(0);

export const openLibrary = async (page: Page) => {
  await page.goto(`/u/${USER}`);
  await expect(discover(page).getByText('Rock', { exact: true })).toBeVisible();
};

export const openAccountPanel = async (page: Page) => {
  await page.getByTitle('Login / Create an account').locator('visible=true').first().click();
};

// on the account page, or the account panel
export const submitLogin = async (page: Page, password: string) => {
  await page.locator('input[name=username]').fill(USER);
  await page.locator('input[name=password]').fill(password);
  await page.locator('input[type=submit]').click();
};

// as a whole word : Tailwind's classes hold it too
export const OPEN = /(^|\s)open(\s|$)/;

// the picture sits over the middle of the band
export const openBand = async (page: Page) => {
  const band = page.getByTitle('Update your background wave');
  await band.click({ position: { x: 10, y: 10 } });
  await expect(band).toHaveClass(OPEN);
  return band;
};

export const logOut = async (page: Page) => {
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.locator('input[name=username]')).toBeVisible();
};

export const pictureFile = () => ({
  name: 'picture.png',
  mimeType: 'image/png',
  // 1 pixel
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
});
