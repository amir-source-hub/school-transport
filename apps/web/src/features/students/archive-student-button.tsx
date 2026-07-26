'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { archiveStudent } from './students-api';

export function ArchiveStudentButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="danger"
      loading={pending}
      onClick={async () => {
        if (!window.confirm('این دانش‌آموز از فهرست فعال حذف شود؟')) return;
        setPending(true);
        try {
          await archiveStudent(id);
          router.replace('/parent/students');
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      حذف دانش‌آموز
    </Button>
  );
}
