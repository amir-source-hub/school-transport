import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatJalaliDateTime } from '@/lib/formatters';
import type { Feedback } from './feedback-api';
export function FeedbackList({ items }: { items: Feedback[] }) {
  if (!items.length) return <p className="text-sm text-muted">هنوز پیامی ثبت نشده است.</p>;
  return (
    <div className="space-y-3">
      {items.map((x) => (
        <Card key={x.id}>
          <div className="flex justify-between gap-2">
            <h3 className="font-black">{x.subject}</h3>
            <Badge tone={x.priority === 'URGENT' ? 'warning' : 'info'}>{x.status}</Badge>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{x.message}</p>
          {x.response && (
            <div className="mt-4 rounded-xl bg-primary-soft p-4">
              <p className="text-xs font-bold text-primary">پاسخ مدیریت</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{x.response}</p>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            {formatJalaliDateTime(x.createdAt.toISOString())}
          </p>
        </Card>
      ))}
    </div>
  );
}
