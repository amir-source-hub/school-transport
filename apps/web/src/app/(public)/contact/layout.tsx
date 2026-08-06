import type { ReactNode } from 'react';

import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/contact');

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
