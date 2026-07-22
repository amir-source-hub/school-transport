import Link from 'next/link';

import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminRegistrations } from '@/features/admin-registrations/admin-registrations-api';

export const metadata = { title: 'درخواست‌های خدمت' };
export const dynamic = 'force-dynamic';

export default async function ServiceRequestsPage() {
  const { registrations } = await getAdminRegistrations();
  const correctionRequests = registrations.filter((r) => r.status === 'نیازمند اصلاح');
  const pendingReview = registrations.filter((r) => r.status === 'ارسال‌شده');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'درخواست‌های خدمت' }]} />
      <div>
        <p className="text-sm font-bold text-primary">پشتیبانی دانش‌آموزان</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">درخواست‌های خدمت</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">در انتظار اصلاح</p>
          <p className="mt-2 text-3xl font-black text-warning">{correctionRequests.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">در انتظار بررسی اولیه</p>
          <p className="mt-2 text-3xl font-black">{pendingReview.length}</p>
        </Card>
      </div>
      {correctionRequests.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-black">درخواست‌های نیازمند اصلاح</h2>
          <div className="grid gap-3">
            {correctionRequests.map((req) => (
              <Link key={req.id} href={`/admin/registrations/${req.id}`}>
                <Card className="transition-colors hover:bg-surface-muted">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{req.studentName}</p>
                      <p className="mt-1 text-sm text-muted">{req.familyName} — {req.schoolName}</p>
                    </div>
                    <Badge tone="warning">{req.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted">{req.trackingCode}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
      {correctionRequests.length === 0 && pendingReview.length === 0 && (
        <Alert title="همه درخواست‌ها در وضعیت عادی">
          در حال حاضر هیچ درخواست خدمتی نیازمند اقدام مدیریت نیست.
        </Alert>
      )}
    </div>
  );
}
