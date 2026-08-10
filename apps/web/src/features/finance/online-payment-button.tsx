import { Button } from '@/components/ui/button';

export function OnlinePaymentButton({
  scheduleItemId,
}: {
  scheduleItemId: string;
  amount: number;
}) {
  return (
    <div aria-describedby={`online-payment-unavailable-${scheduleItemId}`}>
      <Button size="sm" disabled aria-disabled="true">
        پرداخت آنلاین
      </Button>
      <p
        id={`online-payment-unavailable-${scheduleItemId}`}
        className="mt-2 max-w-60 text-xs text-muted"
      >
        به‌زودی فعال می‌شود. فعلاً از پرداخت آفلاین استفاده کنید.
      </p>
    </div>
  );
}
