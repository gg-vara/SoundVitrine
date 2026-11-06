// temporary, not committed : what the pages look like, compared before and after the CSS pass
import type { Page } from '@playwright/test';
import { discover, expect, openAccountPanel, openLibrary, PASSWORD, submitLogin, test } from './helpers';

const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(900);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
    mask: [page.locator('video'), page.locator('.wAnim'), page.locator('.band'), page.locator('.animTimeline')],
  });
};

for (const [label, size] of [
  ['wide', { width: 1280, height: 800 }],
  ['tall', { width: 800, height: 1000 }],
] as const) {
  test.describe(label, () => {
    test.use({ viewport: size });

    test('standalone pages', async ({ page }) => {
      await page.goto('/');
      await shot(page, `${label}-welcome`);
      await page.goto('/account');
      await shot(page, `${label}-login`);
      await submitLogin(page, 'wrongpassword');
      await expect(page.locator('.popup')).toBeVisible();
      await shot(page, `${label}-login-refused`);
      await page.goto('/account/create');
      await shot(page, `${label}-create`);
      await page.goto('/u/testcurator/uploadMusicLibrary');
      await shot(page, `${label}-upload`);
      await page.goto('/account');
      await submitLogin(page, PASSWORD);
      await page.waitForURL('**/u/testcurator');
      await page.goto('/account');
      await shot(page, `${label}-manage`);
      await page.getByTitle('Update your background wave').click({ position: { x: 10, y: 10 } });
      await shot(page, `${label}-band-open`);
    });

    test('library page', async ({ page }) => {
      await openLibrary(page);
      await shot(page, `${label}-library`);
      await page.getByTitle('Feed', { exact: true }).click();
      await page.waitForTimeout(600);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await shot(page, `${label}-feed`);
      await page.getByTitle('Feed', { exact: true }).click();
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.getByTitle('testcurator | Profile').click();
      await shot(page, `${label}-profile`);
      await page.getByTitle('testcurator | Profile').click();
      await page.getByTitle('Statistics', { exact: true }).click();
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await shot(page, `${label}-stats`);
    });

    test('album', async ({ page }) => {
      await openLibrary(page);
      const panel = discover(page);
      await panel.getByText('Rock', { exact: true }).click();
      await shot(page, `${label}-genre`);
      await panel.getByText('Sigur Rós', { exact: true }).click();
      await panel.getByText('Album 0 of Sigur Rós', { exact: true }).click();
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await shot(page, `${label}-album`);
    });

    test('account panel', async ({ page }) => {
      await openLibrary(page);
      await openAccountPanel(page);
      const panel = page.locator('#xmlRLoader, #accountContent');
      await expect(panel.getByRole('button', { name: 'create an account' })).toBeVisible();
      await shot(page, `${label}-panel-login`);
      await panel.getByRole('button', { name: 'create an account' }).click();
      await expect(panel.getByRole('button', { name: /Back/ })).toBeVisible();
      await shot(page, `${label}-panel-create`);
      await panel.getByRole('button', { name: /Back/ }).click();
      await expect(panel.getByRole('heading', { name: 'Connect' })).toBeVisible();
      await submitLogin(page, PASSWORD);
      await expect(panel.getByRole('button', { name: 'Disconnect' })).toBeVisible();
      await shot(page, `${label}-panel-manage`);
      await panel.getByRole('button', { name: 'Disconnect' }).click();
      await expect(panel.locator('input[name=username]')).toBeVisible();
    });
  });
}
