'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { logout } from './auth-api';
import { clearAuthSession } from './auth-session';

export function LogoutMenuItem() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await logout();
    } catch {
      // Local sign-out must still complete if the session already expired.
    } finally {
      clearAuthSession();
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <DropdownMenuItem danger disabled={pending} onSelect={handleLogout}>
      <LogOut aria-hidden="true" className="ms-2 size-4" />
      {pending ? 'در حال خروج…' : 'خروج از حساب'}
    </DropdownMenuItem>
  );
}
