'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatIrr, formatJalaliDate } from '@/lib/formatters';
import type { AdminOfflineSubmission } from './admin-payments-api';
import { ApprovePaymentDialog, ReceiptPreviewDialog, RejectPaymentDialog } from './payment-actions';
import { resetPaymentForResubmission } from './admin-payments-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

function ResetReceiptDialog({
  submission,
  onReset,
}: {
  submission: AdminOfflineSubmission;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          ارسال دوباره رسید
        </Button>
      </DialogTrigger>
      <DialogContent title="بازنشانی رسید برای ارسال دوباره">
        <div className="space-y-4 text-sm leading-7">
          <p>
            رسید فعلی حذف می‌شود و گزینه بارگذاری دوباره برای خانواده فعال می‌شود. اگر پرداخت قبلاً
            تأیید شده باشد، ثبت مالی آن نیز با ثبت حسابرسی بازگردانده می‌شود.
          </p>
          {error && <p className="text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={async () => {
                setPending(true);
                setError(undefined);
                try {
                  await resetPaymentForResubmission(submission.id, submission.version);
                  onReset();
                  setOpen(false);
                } catch (caught) {
                  setError(getApiErrorFeedback(caught).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              تأیید بازنشانی
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OfflineSubmissionList({
  initialItems,
}: {
  initialItems: AdminOfflineSubmission[];
}) {
  const [items, setItems] = useState(initialItems);

  return (
    <div className="space-y-3">
      {items.map((submission) => (
        <Card key={submission.id} variant="outlined">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words font-black">{submission.studentName}</p>
              <p className="mt-1 text-sm text-muted">خانواده {submission.familyName}</p>
            </div>
            <Badge
              tone={
                submission.status === 'APPROVED'
                  ? 'success'
                  : submission.status === 'REJECTED'
                    ? 'danger'
                    : submission.status === 'DRAFT'
                      ? 'neutral'
                      : 'warning'
              }
            >
              {submission.status === 'APPROVED'
                ? 'تأییدشده'
                : submission.status === 'REJECTED'
                  ? 'نیازمند اصلاح'
                  : submission.status === 'DRAFT'
                    ? 'ارسال ناقص'
                    : 'در انتظار بررسی'}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted">نوع</dt>
              <dd className="mt-1 font-bold">
                {submission.itemType === 'PREPAYMENT'
                  ? 'پیش‌پرداخت'
                  : `قسط ${submission.sequenceNumber.toLocaleString('fa-IR')}`}
              </dd>
            </div>
            <div>
              <dt className="text-muted">مبلغ مورد انتظار / ارسالی</dt>
              <dd className="mt-1 font-bold">
                {formatIrr(submission.expectedAmount)} / {formatIrr(submission.submittedAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">تاریخ پرداخت</dt>
              <dd className="mt-1 font-bold">{formatJalaliDate(submission.paidAt)}</dd>
            </div>
            <div>
              <dt className="text-muted">مرجع</dt>
              <dd className="mt-1 break-all font-bold" dir="ltr">
                {submission.referenceNumber}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted">
            مقصد نسخه {submission.destinationSnapshot.version.toLocaleString('fa-IR')} —{' '}
            {submission.destinationSnapshot.bankName}
          </p>
          {submission.rejectionReason && (
            <p className="mt-3 rounded-xl bg-danger/5 p-3 text-sm text-danger">
              دلیل: {submission.rejectionReason}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {submission.status !== 'DRAFT' && <ReceiptPreviewDialog submissionId={submission.id} />}
            <ResetReceiptDialog
              submission={submission}
              onReset={() =>
                setItems((current) => current.filter((item) => item.id !== submission.id))
              }
            />
            {submission.status === 'PENDING_REVIEW' && (
              <>
                <ApprovePaymentDialog
                  paymentId={submission.id}
                  version={submission.version}
                  onApproved={() =>
                    setItems((current) =>
                      current.map((item) =>
                        item.id === submission.id
                          ? { ...item, status: 'APPROVED', version: item.version + 1 }
                          : item,
                      ),
                    )
                  }
                />
                <RejectPaymentDialog
                  paymentId={submission.id}
                  version={submission.version}
                  onRejected={(reason) =>
                    setItems((current) =>
                      current.map((item) =>
                        item.id === submission.id
                          ? {
                              ...item,
                              status: 'REJECTED',
                              rejectionReason: reason,
                              version: item.version + 1,
                            }
                          : item,
                      ),
                    )
                  }
                />
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
