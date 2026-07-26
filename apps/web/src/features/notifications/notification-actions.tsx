'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { markAllNotificationsRead, markNotificationRead } from './notifications-api';
export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  return <Button size="sm" variant="ghost" onClick={async () => { await markNotificationRead(id); router.refresh(); }}>خواندم</Button>;
}
export function MarkAllReadButton() {
  const router = useRouter();
  return <Button size="sm" variant="secondary" onClick={async () => { await markAllNotificationsRead(); router.refresh(); }}>خواندن همه</Button>;
}
