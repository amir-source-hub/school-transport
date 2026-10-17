import { AlertTriangle } from 'lucide-react';

export function UploadCompletionNotice() {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm leading-6 text-foreground"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>
        پس از انتخاب فایل، حتماً دکمه بارگذاری یا ارسال را بزنید و تا نمایش پیام تکمیل موفق از این
        صفحه خارج نشوید، صفحه را تازه‌سازی نکنید و اینترنت را قطع نکنید.
      </p>
    </div>
  );
}
