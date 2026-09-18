import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MapProviderLinks } from './map-provider-links';

describe('MapProviderLinks', () => {
  it('offers Google Maps, Neshan, and Balad for the same coordinates', () => {
    render(<MapProviderLinks latitude={35.6892} longitude={51.389} />);

    expect(screen.getByRole('link', { name: 'باز کردن موقعیت در نشان' })).toHaveAttribute(
      'href',
      'https://neshan.org/maps/@35.6892,51.389,16z,0p',
    );
    expect(screen.getByRole('link', { name: 'باز کردن موقعیت در بلد' })).toHaveAttribute(
      'href',
      'https://balad.ir/location?latitude=35.6892&longitude=51.389&zoom=16',
    );
    expect(screen.getByRole('link', { name: 'باز کردن موقعیت در گوگل‌مپ' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=35.6892,51.389',
    );
  });
});
