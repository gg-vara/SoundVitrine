import { expect, OPEN, openBand, PASSWORD, pictureFile, submitLogin, test, USER } from './helpers';

test('the welcome page lists the users, and leads to the API documentation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: USER })).toHaveAttribute('href', `/u/${USER}`);

  await page.getByRole('link', { name: 'API documentation' }).click();
  await expect(page).toHaveURL(/\/api\/docs/);
  await expect(page.getByRole('heading', { name: /SoundVitrine API/ }).first()).toBeVisible();
});

test('the footer switches the language', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Connect' })).toBeVisible();

  await page.locator('#langs label.unselected').first().click();
  await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible();

  await page.locator('#langs label.unselected').first().click();
  await expect(page.getByRole('heading', { name: 'Connect' })).toBeVisible();
});

test('the account page refuses a wrong password, then logs in on the library', async ({ page }) => {
  await page.goto('/account');
  await submitLogin(page, 'wrongpassword');
  await expect(page.getByText('Wrong password.')).toBeVisible();

  await submitLogin(page, PASSWORD);
  await expect(page).toHaveURL(new RegExp(`/u/${USER}$`));
});

test('the account page changes the band colors and the picture', async ({ page }) => {
  await page.goto('/account');
  await submitLogin(page, PASSWORD);
  await page.waitForURL(`**/u/${USER}`);
  await page.goto('/account');

  const band = await openBand(page);
  await band.locator('input[type=color]').first().fill('#112233');
  await band.getByTitle('Validate').click();
  await expect(band).not.toHaveClass(OPEN);

  const picture = page.locator('input[type=file]');
  await picture.setInputFiles(pictureFile());
  const image = page.getByTitle('Update your profile picture').locator('img');
  await expect(image).toHaveAttribute('src', new RegExp(`/data/users/${USER}/pp.png`));

  await expect(async () => {
    await page.reload();
    await expect(page.locator('input[type=color]').first()).toHaveValue('#112233');
    await expect(image).toHaveAttribute('src', new RegExp(`/data/users/${USER}/pp.png`));
  }).toPass();

  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.locator('input[name=username]')).toBeVisible();
});

test('the upload page has its form', async ({ page }) => {
  await page.goto(`/u/${USER}/uploadMusicLibrary`);
  await expect(page.getByRole('heading', { name: 'Upload your library' })).toBeVisible();
  await expect(page.locator('input[type=file]')).toBeVisible();
  await expect(page.locator('input[type=password]')).toBeVisible();
});
