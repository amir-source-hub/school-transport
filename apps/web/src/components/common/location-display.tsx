'use client';

import { LocationPicker } from './location-picker';
import { MapProviderLinks } from './map-provider-links';

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
      <MapProviderLinks latitude={latitude} longitude={longitude} />
    </div>
  );
}
