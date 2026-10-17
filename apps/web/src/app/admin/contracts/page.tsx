import { redirect } from 'next/navigation';

export const metadata = { title: 'قراردادها' };

export default function ContractsPage() {
  redirect('/admin/students');
}
