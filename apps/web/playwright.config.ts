import { defineConfig, devices } from '@playwright/test';

const webPort = Number(process.env.E2E_WEB_PORT ?? 3100);
const apiPort = Number(process.env.E2E_API_PORT ?? 5100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const apiURL = `http://127.0.0.1:${apiPort}/api/v1`;
const browserChannel = process.env.E2E_BROWSER_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  workers: process.env.CI ? 2 : 1,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: process.env.CI || process.env.E2E_VIDEO === '1' ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: browserChannel },
    },
    {
      name: 'phone-320',
      use: {
        ...devices['Pixel 5'],
        channel: browserChannel,
        viewport: { width: 320, height: 720 },
      },
    },
    {
      name: 'tablet-768',
      use: {
        ...devices['Desktop Chrome'],
        channel: browserChannel,
        hasTouch: true,
        isMobile: true,
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
  webServer: [
    {
      command: `node e2e/mock-api.mjs ${apiPort}`,
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
      timeout: 30_000,
    },
    {
      command: `pnpm dev --hostname 127.0.0.1 --port ${webPort}`,
      url: baseURL,
      reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
      timeout: 120_000,
      env: {
        API_INTERNAL_BASE_URL: apiURL,
        NEXT_PUBLIC_API_BASE_URL: apiURL,
      },
    },
  ],
});
