import { redirect } from 'next/navigation';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/register');

export default function RegisterPage() {
  redirect('/login');
}
