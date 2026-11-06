// The real pages in a real browser, against a seeded server of their own (server/scripts/seed.ts)
import { defineConfig } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  // they share an account, which they log in and out of
  workers: 1,
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'en-US',
    // what is installed here, a downloaded one in CI
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun run dev:seed',
    url: `http://localhost:${PORT}/healthz`,
    reuseExistingServer: false,
    env: { PORT: String(PORT), SEED_STATE: '_state-e2e' },
  },
});
