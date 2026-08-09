import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { notificationCatalog } from './notification.catalog';

describe('notification catalog contracts', () => {
  it('uses only routes declared by the web route metadata', () => {
    const metadata = readFileSync(
      resolve(process.cwd(), '../web/src/lib/route-metadata.ts'),
      'utf8',
    );
    const supportedRoutes = new Set(
      [...metadata.matchAll(/\bpath:\s*'([^']+)'/g)].map((match) => match[1]),
    );

    for (const entry of Object.values(notificationCatalog)) {
      const routes = [
        entry.route({ relatedEntityId: '00000000-0000-4000-8000-000000000001' }),
        entry.adminOperational?.route({
          relatedEntityId: '00000000-0000-4000-8000-000000000001',
        }),
      ].filter((route): route is string => Boolean(route));
      for (const route of routes) expect(supportedRoutes).toContain(route);
    }
  });

  it('makes retained account notifications eligible for both consent-aware channels', () => {
    for (const type of [
      'WELCOME',
      'PROFILE_UPDATED',
      'ADDRESS_UPDATED',
      'EMERGENCY_CONTACT_UPDATED',
    ] as const) {
      expect(notificationCatalog[type].channels).toEqual(['IN_APP', 'SMS']);
      expect(notificationCatalog[type].purpose).toBe('OPTIONAL_UPDATES');
    }
  });

  it('keeps sensitive values and links out of every provider-safe SMS template', () => {
    for (const entry of Object.values(notificationCatalog)) {
      expect(entry.smsMessage).not.toMatch(/https?:\/\/|\b\d{10,}\b|\b\d{1,3}(?:[,.]\d{3})+\b/);
      expect(entry.smsMessage).not.toMatch(/کد ملی|شماره کارت|شبا|مبلغ|آدرس:/);
    }
  });
});
