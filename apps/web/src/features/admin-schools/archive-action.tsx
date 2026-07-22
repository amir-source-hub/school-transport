'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { archiveSchool } from '@/features/admin-schools/admin-schools-api';

export function ArchiveSchoolDialog({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await archiveSchool(schoolId);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بایگانی مدرسه');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">بایگانی</Button>
      </DialogTrigger>
      <DialogContent title="بایگانی مدرسه" description={`مدرسه «${schoolName}» بایگانی می‌شود و دیگر در فهرست مدارس فعال نمایش داده نمی‌شود.`}>
        <div className="space-y-4">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            <Button variant="danger" loading={loading} onClick={handle}>تأیید و بایگانی</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
