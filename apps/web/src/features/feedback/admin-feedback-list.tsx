'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { feedbackAction, type Feedback } from './feedback-api';
export function AdminFeedbackList({ items }: { items: Feedback[] }) {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [pendingId, setPendingId] = useState<string>();
  const pendingRef = useRef(false);
  async function act(x: Feedback, a: 'read' | 'close' | 'respond') {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPendingId(x.id);
    setFailed(false);
    setMsg(undefined);
    try {
      await feedbackAction(x, a, responses[x.id]);
      setMsg('عملیات انجام شد.');
      router.refresh();
    } catch (e) {
      setFailed(true);
      setMsg(getApiErrorFeedback(e).message);
    } finally {
      pendingRef.current = false;
      setPendingId(undefined);
    }
  }
  return (
    <div className="space-y-4">
      {items.map((x) => (
        <Card key={x.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <h3 className="min-w-0 break-words font-black">{x.subject}</h3>
            <span className="text-xs font-bold">
              {x.priority === 'URGENT' ? 'فوری · ' : ''}
              {x.status}
            </span>
          </div>
          <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-7">{x.message}</p>
          {!['ANSWERED', 'CLOSED'].includes(x.status) && (
            <div className="mt-4 space-y-2">
              <Textarea
                aria-label="پاسخ مدیریت"
                value={responses[x.id] ?? ''}
                onChange={(e) => setResponses({ ...responses, [x.id]: e.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => act(x, 'respond')}
                  disabled={(responses[x.id] ?? '').length < 2}
                  loading={pendingId === x.id}
                >
                  ثبت پاسخ
                </Button>
                {x.status === 'NEW' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => act(x, 'read')}
                    disabled={Boolean(pendingId)}
                  >
                    خوانده شد
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => act(x, 'close')}
                  disabled={Boolean(pendingId)}
                >
                  بستن
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
      {msg && (
        <p role={failed ? 'alert' : 'status'} aria-live="polite">
          {msg}
        </p>
      )}
    </div>
  );
}
