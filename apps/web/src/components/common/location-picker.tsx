'use client';

import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let map: Map;
    let marker: Marker;

    async function initMap() {
      const L = await import('leaflet');

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!mapRef.current || mapInstanceRef.current) return;

      map = L.map(mapRef.current, {
        center: [initialPositionRef.current.latitude, initialPositionRef.current.longitude],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      marker = L.marker(
        [initialPositionRef.current.latitude, initialPositionRef.current.longitude],
        { draggable: true },
      ).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeRef.current(pos.lat, pos.lng);
      });

      map.on('click', (e: LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
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
    <div className="relative">
      <div ref={mapRef} className="h-72 w-full rounded-2xl border border-primary/20 z-0" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold shadow z-[1000]">
        <MapPin className="ml-1 inline size-4 text-primary" />
        {latitude.toFixed(6)}، {longitude.toFixed(6)}
      </span>
    </div>
  );
}
