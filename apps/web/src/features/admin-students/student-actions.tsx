'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { archiveStudent } from '@/features/admin-students/admin-students-api';

export function ArchiveStudentDialog({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await archiveStudent(studentId);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بایگانی دانش‌آموز');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">بایگانی</Button>
      </DialogTrigger>
      <DialogContent title="بایگانی دانش‌آموز" description={`دانش‌آموز «${studentName}» بایگانی می‌شود.`}>
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
