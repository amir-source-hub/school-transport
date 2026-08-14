'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { createFeedback, createManagerFeedback } from './feedback-api';
const categories = [
  ['SUGGESTION', 'پیشنهاد'],
  ['SERVICE', 'خدمات'],
  ['DRIVER', 'راننده'],
  ['SCHOOL', 'مدرسه'],
  ['BILLING', 'مالی'],
  ['APP', 'سامانه'],
  ['SAFETY', 'ایمنی فوری'],
] as const;
export function FeedbackForm({ audience = 'parent' }: { audience?: 'parent' | 'manager' }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [failed, setFailed] = useState(false);
  const pendingRef = useRef(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setFailed(false);
    setMsg(undefined);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const create = audience === 'manager' ? createManagerFeedback : createFeedback;
      await create({
        category: String(f.get('category')),
        subject: String(f.get('subject')),
        message: String(f.get('message')),
      });
      form.reset();
      setMsg('پیام شما ثبت شد.');
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMsg(getApiErrorFeedback(error).message);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
      <label className="block space-y-2">
        <span className="text-sm font-bold">دسته‌بندی</span>
        <select
          name="category"
          className="min-h-12 w-full rounded-xl border border-border bg-white px-3"
        >
          {categories.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold">موضوع</span>
        <Input name="subject" required minLength={3} maxLength={120} />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold">متن پیام</span>
        <Textarea name="message" required minLength={10} maxLength={2000} />
      </label>
      <p className="text-xs leading-6 text-muted">
        برای گزارش خطر فوری، دسته «ایمنی فوری» را انتخاب کنید. پیام پس از ثبت قابل ویرایش نیست.
      </p>
      <Button loading={pending} disabled={pending}>
        ثبت پیام
      </Button>
      {msg && (
        <p role={failed ? 'alert' : 'status'} aria-live="polite" className="text-sm text-muted">
          {msg}
        </p>
      )}
    </form>
  );
}
