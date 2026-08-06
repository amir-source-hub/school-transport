import { expect, test as base } from '@playwright/test';

export { expect };

export const test = base.extend<{ pageHealth: void }>({
  pageHealth: [
    async ({ page }, use) => {
      const failures: string[] = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        failures.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
      page.on('requestfailed', (request) => {
        if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
        failures.push(
          `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`,
        );
      });

      await use();
      expect(failures, 'Unexpected browser console/page/network failures').toEqual([]);
    },
    { auto: true },
  ],
});
