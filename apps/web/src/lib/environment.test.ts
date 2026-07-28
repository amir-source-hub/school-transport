import { describe, expect, it } from 'vitest';

import { validateWebEnvironment } from './environment';

describe('validateWebEnvironment', () => {
  it('uses the documented local API URL during development', () => {
    expect(validateWebEnvironment({ production: false })).toEqual({
      apiBaseUrl: 'http://localhost:5000/api/v1',
      production: false,
    });
  });

  it('requires an API URL for production builds', () => {
    expect(() => validateWebEnvironment({ production: true })).toThrow(
      'NEXT_PUBLIC_API_BASE_URL is required for production builds.',
    );
  });

  it('rejects non-HTTPS production API URLs', () => {
    expect(() =>
      validateWebEnvironment({
        apiBaseUrl: 'http://api.example.test/api/v1',
        production: true,
      }),
    ).toThrow('NEXT_PUBLIC_API_BASE_URL must use HTTPS in production.');
  });

  it('allows the documented loopback API URL for a local production container', () => {
    expect(
      validateWebEnvironment({
        apiBaseUrl: 'http://localhost:5000/api/v1',
        production: true,
      }),
    ).toEqual({
      apiBaseUrl: 'http://localhost:5000/api/v1',
      production: true,
    });
  });

  it('normalizes an approved production API URL', () => {
    expect(
      validateWebEnvironment({
        apiBaseUrl: 'https://api.example.test/api/v1/',
        production: true,
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.example.test/api/v1',
      production: true,
    });
  });
});
