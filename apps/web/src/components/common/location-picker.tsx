'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import type { LeafletMouseEvent, Map, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type LocationPickerProps = {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
};

export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialPositionRef = useRef({ latitude, longitude });
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [mapError, setMapError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let map: Map | undefined;
    let marker: Marker | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let active = true;

    async function initMap() {
      setLoading(true);
      setMapError(undefined);
      try {
        const L = await import('leaflet');

        if (!active || !mapRef.current || mapInstanceRef.current) return;

        map = L.map(mapRef.current, {
          center: [initialPositionRef.current.latitude, initialPositionRef.current.longitude],
          zoom: 16,
          zoomControl: true,
          scrollWheelZoom: false,
          keyboard: true,
          touchZoom: true,
        });

        const tiles = L.tileLayer(`/api/map-tiles/{z}/{x}/{y}?attempt=${retryAttempt}`, {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });
        tiles.on('load', () => {
          if (!active) return;
          setLoading(false);
          setMapError(undefined);
        });
        tiles.on('tileerror', () => {
          if (!active) return;
          setLoading(false);
          setMapError('بارگذاری نقشه انجام نشد. نشانی را دستی تکمیل کنید یا دوباره تلاش کنید.');
        });
        tiles.addTo(map);

        marker = L.marker(
          [initialPositionRef.current.latitude, initialPositionRef.current.longitude],
          {
            draggable: true,
            icon: L.divIcon({
              className: 'location-picker-marker',
              html: '<span aria-hidden="true"></span>',
              iconSize: [34, 42],
              iconAnchor: [17, 42],
            }),
          },
        ).addTo(map);

        marker.on('dragend', () => {
          const pos = marker?.getLatLng();
          if (pos) onChangeRef.current(pos.lat, pos.lng);
        });

        map.on('click', (e: LeafletMouseEvent) => {
          marker?.setLatLng(e.latlng);
          onChangeRef.current(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        requestAnimationFrame(() => map?.invalidateSize());
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
          resizeObserver.observe(mapRef.current);
        }
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') map?.invalidateSize({ pan: false });
        };
        document.addEventListener('visibilitychange', handleVisibility);
        map.once('unload', () =>
          document.removeEventListener('visibilitychange', handleVisibility),
        );
      } catch {
        if (!active) return;
        setLoading(false);
        setMapError('نقشه در دسترس نیست. نشانی را دستی تکمیل کنید یا دوباره تلاش کنید.');
      }
    }

    initMap();

    return () => {
      active = false;
      resizeObserver?.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [retryAttempt]);

  useEffect(() => {
    initialPositionRef.current = { latitude, longitude };
    const marker = markerRef.current;
    const map = mapInstanceRef.current;
    if (!marker || !map) return;
    const current = marker.getLatLng();
    if (current.lat !== latitude || current.lng !== longitude) {
      marker.setLatLng([latitude, longitude]);
      map.setView([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <div>
      <div className="relative">
        <div
          ref={mapRef}
          tabIndex={0}
          className="z-0 h-64 w-full rounded-2xl border border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-72"
          aria-label="نقشه انتخاب موقعیت؛ برای جابه‌جایی نشانگر روی نقشه کلیک کنید"
          aria-describedby="location-picker-help"
        />
        <span className="pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[calc(100%-1.5rem)] rounded-lg bg-white/95 px-3 py-2 text-xs font-bold shadow">
          <MapPin aria-hidden="true" className="ml-1 inline size-4 text-primary" />
          {latitude.toFixed(6)}، {longitude.toFixed(6)}
        </span>
      </div>
      <p id="location-picker-help" className="mt-2 text-xs leading-6 text-muted">
        برای جلوگیری از جابه‌جایی ناخواسته صفحه، بزرگ‌نمایی با چرخ ماوس غیرفعال است. می‌توانید
        نشانگر را بکشید، روی نقشه کلیک کنید یا مختصات را دستی وارد کنید.
      </p>
      {loading && (
        <p role="status" className="mt-2 text-xs text-muted">
          در حال بارگذاری نقشه…
        </p>
      )}
      {mapError && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-danger">
          <span>{mapError}</span>
          <button
            type="button"
            onClick={() => setRetryAttempt((attempt) => attempt + 1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-danger/30 px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            تلاش دوباره
          </button>
        </div>
      )}
    </div>
  );
}
