'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { archiveSchool, unarchiveSchool } from '@/features/admin-schools/admin-schools-api';

export function ArchiveSchoolDialog({
  schoolId,
  schoolName,
  archived = false,
}: {
  schoolId: string;
  schoolName: string;
  archived?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await (archived ? unarchiveSchool(schoolId) : archiveSchool(schoolId));
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تغییر وضعیت مدرسه');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {archived ? 'فعال‌سازی مجدد' : 'بایگانی'}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={archived ? 'فعال‌سازی مدرسه' : 'بایگانی مدرسه'}
        description={
          archived
            ? `مدرسه «${schoolName}» دوباره در فهرست مدارس فعال نمایش داده می‌شود.`
            : `مدرسه «${schoolName}» بایگانی می‌شود و دیگر در فهرست مدارس فعال نمایش داده نمی‌شود.`
        }
      >
        <div className="space-y-4">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button variant={archived ? 'primary' : 'danger'} loading={loading} onClick={handle}>
              {archived ? 'تأیید و فعال‌سازی' : 'تأیید و بایگانی'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
