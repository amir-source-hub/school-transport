// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestCurrentLocation } from './current-location';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestCurrentLocation', () => {
  it('requests browser location and returns its coordinates', async () => {
    const coords = { latitude: 35.7, longitude: 51.4 } as GeolocationCoordinates;
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords } as GeolocationPosition));
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    await expect(requestCurrentLocation()).resolves.toBe(coords);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('retries without high accuracy if the first lookup times out', async () => {
    const coords = { latitude: 35.7, longitude: 51.4 } as GeolocationCoordinates;
    const getCurrentPosition = vi.fn()
      .mockImplementationOnce((_success, failure) => failure({ code: 3, PERMISSION_DENIED: 1 }))
      .mockImplementationOnce((success) => success({ coords }));
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    await expect(requestCurrentLocation()).resolves.toBe(coords);
    expect(getCurrentPosition.mock.calls[1][2]).toMatchObject({ enableHighAccuracy: false });
  });
});
