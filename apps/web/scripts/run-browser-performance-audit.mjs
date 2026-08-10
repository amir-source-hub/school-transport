import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const budgets = JSON.parse(await readFile(path.join(root, 'performance/budgets.json'), 'utf8'));
const baseURL = process.env.PERFORMANCE_BASE_URL ?? 'http://127.0.0.1:3000';
const browserChannel = process.env.PERFORMANCE_BROWSER_CHANNEL ?? 'chrome';
const browserExecutablePath = process.env.PERFORMANCE_BROWSER_EXECUTABLE_PATH;
const scope =
  process.argv.find((argument) => argument.startsWith('--scope='))?.split('=')[1] ?? 'full';
const profiles = process.argv.find((argument) => argument.startsWith('--profile='))?.split('=')[1];
const selectedProfiles = profiles ? [profiles] : Object.keys(budgets.profiles);
const selectedRoutes = scope === 'smoke' ? ['/', '/about', '/login'] : budgets.routes;
const outputDirectory = path.join(root, 'performance-results');
await mkdir(outputDirectory, { recursive: true });

const interactions = {
  '/': 'button[aria-label="بعدی"]',
  '/about': '#main-content a[href="/contact"]',
  '/contact': 'main button',
  '/faq': 'main button',
  '/pricing': 'main button',
  '/registration-guide': 'main button',
  '/safety': '#main-content a[href="/contact"]',
  '/schools': '#school-directory button',
  '/services': 'main button',
  '/login': 'button[type="submit"]',
};

const browser = await chromium.launch({
  headless: true,
  ...(browserExecutablePath
    ? { executablePath: browserExecutablePath }
    : { channel: browserChannel }),
});
const results = [];

for (const profileName of selectedProfiles) {
  const budget = budgets.profiles[profileName];
  if (!budget) throw new Error(`Unknown performance profile: ${profileName}`);
  const [width, height] = budget.viewport.split('x').map(Number);
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: profileName === 'mobile' ? 2 : 1,
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  const network =
    profileName === 'mobile'
      ? {
          offline: false,
          latency: 150,
          downloadThroughput: 1_600_000 / 8,
          uploadThroughput: 750_000 / 8,
          connectionType: 'cellular4g',
        }
      : {
          offline: false,
          latency: 40,
          downloadThroughput: 10_000_000 / 8,
          uploadThroughput: 5_000_000 / 8,
          connectionType: 'wifi',
        };
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.emulateNetworkConditions', network);
  await client.send('Emulation.setCPUThrottlingRate', { rate: profileName === 'mobile' ? 4 : 1 });

  for (const route of selectedRoutes) {
    await client.send('Network.clearBrowserCache');
    let requestCount = 0;
    const transferMeasurements = [];
    const onRequest = () => {
      requestCount += 1;
    };
    const onResponse = (response) => {
      transferMeasurements.push(
        response
          .request()
          .sizes()
          .then((sizes) => ({
            bytes: sizes.responseBodySize + sizes.responseHeadersSize,
            resourceType: response.request().resourceType(),
            contentType: response.headers()['content-type'] ?? '',
          })),
      );
    };
    page.on('request', onRequest);
    page.on('response', onResponse);
    await page.addInitScript(() => {
      window.__performanceAudit = {
        lcp: 0,
        cls: 0,
        interactions: [],
        fallbackInteraction: 0,
        interactionObserved: false,
        layoutShiftSources: [],
      };
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        window.__performanceAudit.lcp = entries.at(-1)?.startTime ?? window.__performanceAudit.lcp;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__performanceAudit.cls += entry.value;
            window.__performanceAudit.layoutShiftSources.push({
              value: entry.value,
              sources: (entry.sources ?? []).map((source) => ({
                node: source.node
                  ? `${source.node.tagName?.toLowerCase() ?? ''}${source.node.id ? `#${source.node.id}` : ''}.${[...(source.node.classList ?? [])].slice(0, 4).join('.')}`
                  : 'unknown',
                previousRect: source.previousRect,
                currentRect: source.currentRect,
              })),
            });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.interactionId) window.__performanceAudit.interactions.push(entry.duration);
          }
        }).observe({ type: 'event', buffered: true, durationThreshold: 0 });
      } catch {}
    });

    const response = await page.goto(`${baseURL}${route}`, {
      waitUntil: 'networkidle',
      timeout: 45_000,
    });
    const selector = interactions[route];
    if (!selector)
      throw new Error(`No representative application interaction configured for ${route}`);
    const control = page.locator(selector).filter({ visible: true }).first();
    await control.scrollIntoViewIfNeeded();
    await control.waitFor({ state: 'visible' });
    await page.evaluate(() => {
      let interactionStart = 0;
      const markInteractionStart = () => {
        interactionStart ||= performance.now();
      };
      document.addEventListener('pointerdown', markInteractionStart, { capture: true, once: true });
      document.addEventListener('keydown', markInteractionStart, { capture: true, once: true });
      document.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.__performanceAudit.fallbackInteraction = performance.now() - interactionStart;
              window.__performanceAudit.interactionObserved = true;
            }),
          );
        },
        { capture: true, once: true },
      );
    });
    await control.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__performanceAudit.interactionObserved);
    await page.waitForTimeout(250);

    const browserMetrics = await page.evaluate(() => {
      const audit = window.__performanceAudit;
      return {
        largestContentfulPaintMs: audit.lcp,
        cumulativeLayoutShift: audit.cls,
        interactionToNextPaintMs: Math.max(...audit.interactions, audit.fallbackInteraction, 0),
        interactionEventTimingMs: Math.max(...audit.interactions, 0),
        interactionPaintFallbackMs: audit.fallbackInteraction,
        layoutShiftSources: audit.layoutShiftSources,
      };
    });
    const transfers = await Promise.all(transferMeasurements);
    page.off('request', onRequest);
    page.off('response', onResponse);
    const metrics = {
      ...browserMetrics,
      imageTransferBytes: transfers
        .filter((item) => item.resourceType === 'image' || item.contentType.startsWith('image/'))
        .reduce((sum, item) => sum + item.bytes, 0),
      javascriptTransferBytes: transfers
        .filter((item) => item.resourceType === 'script' || item.contentType.includes('javascript'))
        .reduce((sum, item) => sum + item.bytes, 0),
      requestCount,
    };
    const violations = Object.entries(metrics)
      .filter(([, value]) => typeof value === 'number')
      .filter(([metric, value]) => value > budget[metric])
      .map(([metric, value]) => ({ metric, measured: value, budget: budget[metric] }));
    if (!metrics.interactionToNextPaintMs)
      violations.push({ metric: 'interactionMetric', measured: 0, budget: 'observed' });
    if (!response?.ok())
      violations.push({ metric: 'httpStatus', measured: response?.status() ?? 0, budget: '2xx' });
    results.push({ profile: profileName, route, status: response?.status(), metrics, violations });
  }
  await context.close();
}

await browser.close();
const report = { generatedAt: new Date().toISOString(), baseURL, scope, results };
const reportPath = path.join(outputDirectory, `performance-${scope}.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
const violations = results.flatMap((result) =>
  result.violations.map((violation) => ({
    ...violation,
    route: result.route,
    profile: result.profile,
  })),
);
console.log(`Performance report: ${reportPath}`);
for (const result of results)
  console.log(`${result.profile} ${result.route}: ${JSON.stringify(result.metrics)}`);
if (violations.length) {
  console.error(
    `Performance budgets failed:\n${violations.map((item) => `${item.profile} ${item.route} ${item.metric}: ${item.measured} > ${item.budget}`).join('\n')}`,
  );
  process.exit(1);
}
