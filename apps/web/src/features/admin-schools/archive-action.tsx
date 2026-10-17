'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { archiveSchool, unarchiveSchool } from '@/features/admin-schools/admin-schools-api';
import { permanentlyDeleteSchool } from '@/features/admin-schools/admin-schools-api';
import { ApiClientError } from '@/lib/api-client';

export function DeleteSchoolButton({
  schoolId,
  schoolName,
}: {
  schoolId: string;
  schoolName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        size="sm"
        loading={loading}
        onClick={async () => {
          if (!window.confirm(`مدرسه «${schoolName}» برای همیشه حذف شود؟`)) return;
          setError(null);
          setLoading(true);
          try {
            await permanentlyDeleteSchool(schoolId);
            router.refresh();
          } catch (caught) {
            setError(
              caught instanceof ApiClientError && caught.code === 'RELATED_RESOURCE_CONFLICT'
                ? 'این مدرسه هنوز اطلاعات مرتبط دارد و برای حفظ سوابق قابل حذف دائمی نیست. آن را بایگانی‌شده نگه دارید.'
                : caught instanceof Error
                  ? caught.message
                  : 'حذف مدرسه انجام نشد.',
            );
          } finally {
            setLoading(false);
          }
        }}
      >
        حذف دائمی
      </Button>
      {error && <p role="alert" className="max-w-sm text-sm text-danger">{error}</p>}
    </div>
  );
}

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
