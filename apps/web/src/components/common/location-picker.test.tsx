import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationPicker } from './location-picker';

const leaflet = vi.hoisted(() => {
  const tileHandlers: Record<string, () => void> = {};
  const mapInstance = {
    on: vi.fn(),
    once: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    setView: vi.fn(),
  };
  const markerInstance = {
    addTo: vi.fn(),
    on: vi.fn(),
    getLatLng: vi.fn(() => ({ lat: 35.7, lng: 51.3 })),
    setLatLng: vi.fn(),
  };
  const tileLayer = vi.fn(() => ({
    on: vi.fn((event: string, callback: () => void) => {
      tileHandlers[event] = callback;
    }),
    addTo: vi.fn(),
  }));
  return { tileHandlers, mapInstance, markerInstance, tileLayer };
});

vi.mock('leaflet', () => ({
  map: vi.fn(() => leaflet.mapInstance),
  tileLayer: leaflet.tileLayer,
  marker: vi.fn(() => leaflet.markerInstance),
  divIcon: vi.fn(() => ({})),
}));

describe('LocationPicker', () => {
  beforeEach(() => {
    for (const event of Object.keys(leaflet.tileHandlers)) delete leaflet.tileHandlers[event];
    leaflet.tileLayer.mockClear();
    leaflet.mapInstance.remove.mockClear();
    leaflet.mapInstance.invalidateSize.mockClear();
  });

  it('shows a manual-address fallback and retries failed tile loading', async () => {
    const user = userEvent.setup();
    render(<LocationPicker latitude={35.7} longitude={51.3} onChange={vi.fn()} />);
    await waitFor(() => expect(leaflet.tileLayer).toHaveBeenCalledOnce());

    act(() => leaflet.tileHandlers.tileerror());

    expect(
      screen.getByText('بارگذاری نقشه انجام نشد. نشانی را دستی تکمیل کنید یا دوباره تلاش کنید.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'تلاش دوباره' }));

    await waitFor(() => expect(leaflet.tileLayer).toHaveBeenCalledTimes(2));
    expect(leaflet.tileLayer).toHaveBeenLastCalledWith(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      expect.objectContaining({ maxZoom: 19 }),
    );
  });

  it('clears loading feedback after tiles load and keeps provider attribution', async () => {
    render(<LocationPicker latitude={35.7} longitude={51.3} onChange={vi.fn()} />);
    await waitFor(() => expect(leaflet.tileLayer).toHaveBeenCalledOnce());

    act(() => leaflet.tileHandlers.load());

    expect(screen.queryByText('در حال بارگذاری نقشه…')).not.toBeInTheDocument();
    expect(leaflet.tileLayer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ attribution: expect.stringContaining('OpenStreetMap') }),
    );
  });

  it('is keyboard focusable and disables scroll-wheel zoom to preserve page scrolling', async () => {
    const L = await import('leaflet');
    render(<LocationPicker latitude={35.7} longitude={51.3} onChange={vi.fn()} />);

    const mapRegion = screen.getByLabelText(/نقشه انتخاب موقعیت/);
    expect(mapRegion).toHaveAttribute('tabindex', '0');
    expect(mapRegion).toHaveAccessibleDescription(/بزرگ‌نمایی با چرخ ماوس غیرفعال است/);
    await waitFor(() =>
      expect(L.map).toHaveBeenCalledWith(
        mapRegion,
        expect.objectContaining({ scrollWheelZoom: false, keyboard: true, touchZoom: true }),
      ),
    );
  });
});
