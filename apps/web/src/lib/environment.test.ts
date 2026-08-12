import { describe, expect, it } from 'vitest';

import { validateWebEnvironment } from './environment';

describe('validateWebEnvironment', () => {
  it('uses the documented local API URL during development', () => {
    expect(validateWebEnvironment({ production: false })).toEqual({
      apiBaseUrl: 'http://localhost:5000/api/v1',
      deploymentId: undefined,
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
        deploymentId: 'release-123',
        serverActionsEncryptionKey: 'MDEyMzQ1Njc4OWFiY2RlZg==',
        production: true,
      }),
    ).toThrow('NEXT_PUBLIC_API_BASE_URL must use HTTPS in production.');
  });

  it('allows the documented loopback API URL for a local production container', () => {
    expect(
      validateWebEnvironment({
        apiBaseUrl: 'http://localhost:5000/api/v1',
        deploymentId: 'release-local',
        serverActionsEncryptionKey: 'MDEyMzQ1Njc4OWFiY2RlZg==',
        publicAssetBaseUrl: 'http://localhost:3000',
        production: true,
      }),
    ).toEqual({
      apiBaseUrl: 'http://localhost:5000/api/v1',
      deploymentId: 'release-local',
      publicAssetBaseUrl: 'http://localhost:3000',
      production: true,
    });
  });

  it('normalizes an approved production API URL', () => {
    expect(
      validateWebEnvironment({
        apiBaseUrl: 'https://api.example.test/api/v1/',
        deploymentId: 'release-123',
        serverActionsEncryptionKey: 'MDEyMzQ1Njc4OWFiY2RlZg==',
        publicAssetBaseUrl: 'https://assets.example.test/public/site/release-123/',
        production: true,
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.example.test/api/v1',
      deploymentId: 'release-123',
      publicAssetBaseUrl: 'https://assets.example.test/public/site/release-123',
      production: true,
    });
  });

  it('requires a safe HTTPS public asset base in production', () => {
    expect(() =>
      validateWebEnvironment({
        apiBaseUrl: 'https://api.example.test/api/v1',
        deploymentId: 'release-123',
        serverActionsEncryptionKey: 'MDEyMzQ1Njc4OWFiY2RlZg==',
        production: true,
      }),
    ).toThrow('NEXT_PUBLIC_ASSET_BASE_URL is required');

    expect(() =>
      validateWebEnvironment({
        apiBaseUrl: 'https://api.example.test/api/v1',
        publicAssetBaseUrl: 'http://assets.example.test/release',
        deploymentId: 'release-123',
        serverActionsEncryptionKey: 'MDEyMzQ1Njc4OWFiY2RlZg==',
        production: true,
      }),
    ).toThrow('NEXT_PUBLIC_ASSET_BASE_URL must use HTTPS');
  });

  it('requires an immutable deployment ID and valid shared Server Action key in production', () => {
    expect(() =>
      validateWebEnvironment({
        apiBaseUrl: 'https://api.example.test/api/v1',
        production: true,
      }),
    ).toThrow('NEXT_DEPLOYMENT_ID is required');

    expect(() =>
      validateWebEnvironment({
        apiBaseUrl: 'https://api.example.test/api/v1',
        deploymentId: 'release-123',
        serverActionsEncryptionKey: 'not-base64',
        production: true,
      }),
    ).toThrow('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY');
  });
});
