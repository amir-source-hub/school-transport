import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { routeDocumentPolicies } from './route-metadata';

const appRoot = resolve(process.cwd(), 'src/app');
const headingProviders: Record<string, string> = {
  '/': resolve(process.cwd(), 'src/features/public-home/public-hero.tsx'),
  '/parent/dashboard': resolve(process.cwd(), 'src/features/parent-dashboard/parent-dashboard.tsx'),
};

function pageFile(path: string): string {
  const segments = path === '/' ? [] : path.slice(1).split('/');
  const group = routeDocumentPolicies.find((policy) => policy.path === path)?.audience;
  const grouped =
    group === 'public'
      ? ['(public)', ...segments]
      : group === 'auth'
        ? ['(auth)', ...segments]
        : segments;
  return resolve(appRoot, ...grouped, 'page.tsx');
}

function discoverPages(directory = appRoot): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) return discoverPages(target);
    return entry.name === 'page.tsx' ? [target] : [];
  });
}

function routeFromPage(file: string): string {
  const segments = relative(appRoot, file)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !segment.startsWith('('));
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

describe('route document quality', () => {
  it('keeps Persian RTL semantics on the root document', () => {
    const source = readFileSync(resolve(appRoot, 'layout.tsx'), 'utf8');
    expect(source).toContain('<html lang="fa" dir="rtl"');
  });

  it('covers every page file in the route policy inventory', () => {
    const inventoryFiles = routeDocumentPolicies.map(({ path }) =>
      relative(appRoot, pageFile(path)),
    );
    expect(inventoryFiles.every((file) => !file.startsWith(`..${sep}`))).toBe(true);
    for (const file of inventoryFiles)
      expect(() => readFileSync(resolve(appRoot, file))).not.toThrow();
    expect(routeDocumentPolicies.map(({ path }) => path).sort()).toEqual(
      discoverPages().map(routeFromPage).sort(),
    );
  });

  it('renders exactly one h1 for content routes and none for redirects', () => {
    for (const policy of routeDocumentPolicies) {
      const source = readFileSync(pageFile(policy.path), 'utf8');
      const provider = headingProviders[policy.path]
        ? readFileSync(headingProviders[policy.path], 'utf8')
        : '';
      const headingCount =
        (source.match(/<h1\b/g) ?? []).length + (provider.match(/<h1\b/g) ?? []).length;

      if (policy.redirectTo) {
        expect(source, policy.path).toContain(`redirect('${policy.redirectTo}')`);
        expect(headingCount, policy.path).toBe(0);
      } else {
        expect(headingCount, policy.path).toBe(1);
      }

      if (policy.audience === 'public') {
        expect(`${source}\n${provider}`, policy.path).toContain(policy.primaryHeading);
      }
    }
  });

  it('keeps loading, not-found, and error documents understandable', () => {
    const rootError = readFileSync(resolve(appRoot, 'error.tsx'), 'utf8');
    const notFound = readFileSync(resolve(appRoot, 'not-found.tsx'), 'utf8');
    const loading = readFileSync(resolve(appRoot, 'loading.tsx'), 'utf8');
    const routeError = readFileSync(
      resolve(process.cwd(), 'src/components/feedback/route-error.tsx'),
      'utf8',
    );
    const routeLoading = readFileSync(
      resolve(process.cwd(), 'src/components/feedback/route-loading.tsx'),
      'utf8',
    );

    expect((rootError.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(rootError).toContain('role="alert"');
    expect((notFound.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(notFound).toContain('صفحه موردنظر پیدا نشد');
    expect(loading).toContain('aria-label="در حال بارگذاری"');
    expect(routeError).toContain('role="alert"');
    expect((routeError.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(routeLoading).toContain('role="status"');
  });
});
