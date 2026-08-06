import type { ReactNode } from 'react';

import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/services');

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
