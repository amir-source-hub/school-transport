import { describe, expect, it } from 'vitest';

import { metadataFor, routeDocumentPolicies, SITE_URL } from './route-metadata';

describe('route document policy', () => {
  it('covers unique routes and resolved titles', () => {
    const paths = routeDocumentPolicies.map(({ path }) => path);
    expect(new Set(paths).size).toBe(paths.length);

    const resolvedTitles = routeDocumentPolicies.map(({ audience, title }) =>
      audience === 'public' ? `${title} | سامانه سرویس مدرسه` : `${title} | ${audience}`,
    );
    expect(new Set(resolvedTitles).size).toBe(resolvedTitles.length);
  });

  it('gives public routes Persian descriptions and canonical URLs', () => {
    for (const policy of routeDocumentPolicies.filter(({ audience }) => audience === 'public')) {
      const metadata = metadataFor(policy.path);
      expect(policy.description).toMatch(/[\u0600-\u06ff]/);
      expect(policy.primaryHeading).toMatch(/[\u0600-\u06ff]/);
      expect(new URL(policy.canonical!, SITE_URL).origin).toBe(SITE_URL.origin);
      expect(metadata.alternates?.canonical).toBe(policy.canonical);
      expect(metadata.robots).toBeUndefined();
    }
  });

  it('marks auth and portal routes noindex without sensitive dynamic titles', () => {
    for (const policy of routeDocumentPolicies.filter(({ audience }) => audience !== 'public')) {
      const metadata = metadataFor(policy.path);
      expect(metadata.robots).toMatchObject({ index: false, follow: false });
      expect(metadata.alternates).toBeUndefined();
      expect(policy.title).not.toContain('[');
      expect(policy.description).toMatch(/[\u0600-\u06ff]/);
    }
  });
});
