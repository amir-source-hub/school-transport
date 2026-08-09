import Link from 'next/link';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { ButtonLink } from '@/components/ui/button';
import { AdminPhotoReviewQueue } from '@/features/student-photos/admin-photo-review-queue';
import { getAdminPhotos } from '@/features/student-photos/admin-student-photos-api';

export const metadata = { title: 'بررسی عکس کارت سرویس' };

export default async function AdminStudentPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = params.status || 'PENDING_REVIEW';
  const list = await getAdminPhotos({ page, status });
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'بررسی عکس‌ها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">صف مشترک مدیران</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">بررسی عکس کارت سرویس</h1>
      </div>
      <form className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">
          وضعیت
          <select
            name="status"
            defaultValue={status}
            className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2"
          >
            <option value="PENDING_REVIEW">در انتظار بررسی</option>
            <option value="APPROVED">تأییدشده</option>
            <option value="REJECTED">ردشده</option>
            <option value="FAILED">ناموفق</option>
          </select>
        </label>
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
          اعمال
        </button>
        <Link
          href="/admin/student-photos"
          className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          پاک‌کردن
        </Link>
      </form>
      <AdminPhotoReviewQueue items={list.items} />
      {totalPages > 1 && (
        <nav aria-label="صفحه‌بندی عکس‌ها" className="flex justify-between">
          {page > 1 ? (
            <ButtonLink
              variant="secondary"
              href={`/admin/student-photos?status=${status}&page=${page - 1}`}
            >
              قبلی
            </ButtonLink>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            صفحه {page} از {totalPages}
          </span>
          {page < totalPages ? (
            <ButtonLink
              variant="secondary"
              href={`/admin/student-photos?status=${status}&page=${page + 1}`}
            >
              بعدی
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
