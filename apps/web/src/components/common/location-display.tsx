'use client';

import { LocationPicker } from './location-picker';

export function LocationDisplay({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-sm font-bold" dir="ltr">
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </p>
      <LocationPicker latitude={latitude} longitude={longitude} onChange={() => undefined} readOnly />
      <a
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center text-sm font-bold text-primary hover:underline"
      >
        مشاهده در نقشه بیرونی
      </a>
    </div>
  );
}
