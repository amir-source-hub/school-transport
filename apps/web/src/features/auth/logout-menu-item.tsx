'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from './auth-api';
import { clearAuthSession } from './auth-session';
import { cn } from '@/lib/cn';

export function LogoutMenuItem({ mobile = false }: { mobile?: boolean }) {
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
    <button
      type="button"
      disabled={pending}
      onClick={handleLogout}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] border border-danger/25 px-3 text-sm font-bold text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60',
        mobile
          ? 'bg-danger/5 hover:bg-danger/10'
          : 'border-red-200/30 bg-white/5 text-red-200 hover:bg-danger/15',
      )}
    >
      <LogOut aria-hidden="true" className="size-5" />
      {pending ? 'در حال خروج…' : 'خروج از حساب'}
    </button>
  );
}
