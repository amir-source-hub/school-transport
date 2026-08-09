import { expect, test as base } from '@playwright/test';

export { expect };

export const test = base.extend<{ pageHealth: void }>({
  pageHealth: [
    async ({ page }, use, testInfo) => {
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
      const allowedFailures = testInfo.annotations
        .filter(({ type }) => type === 'allowed-browser-failure')
        .map(({ description }) => description)
        .filter((description): description is string => Boolean(description));
      const unexpectedFailures = failures.filter(
        (failure) => !allowedFailures.some((allowed) => failure.includes(allowed)),
      );
      expect(unexpectedFailures, 'Unexpected browser console/page/network failures').toEqual([]);
    },
    { auto: true },
  ],
});
