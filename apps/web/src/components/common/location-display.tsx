'use client';

import { ExternalLink } from 'lucide-react';

import { LocationPicker } from './location-picker';

export function LocationDisplay({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <div className="space-y-2">
      <LocationPicker
        latitude={latitude}
        longitude={longitude}
        onChange={() => undefined}
        readOnly
        showCoordinates={false}
      />
      <a
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-primary/90"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
        باز کردن در گوگل مپ
      </a>
    </div>
  );
}
