'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { createFeedback } from './feedback-api';
const categories = [
  ['SUGGESTION', 'پیشنهاد'],
  ['SERVICE', 'خدمات'],
  ['DRIVER', 'راننده'],
  ['SCHOOL', 'مدرسه'],
  ['BILLING', 'مالی'],
  ['APP', 'سامانه'],
  ['SAFETY', 'ایمنی فوری'],
] as const;
export function FeedbackForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string>();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const f = new FormData(e.currentTarget);
    try {
      await createFeedback({
        category: String(f.get('category')),
        subject: String(f.get('subject')),
        message: String(f.get('message')),
      });
      e.currentTarget.reset();
      setMsg('پیام شما ثبت شد.');
      router.refresh();
    } catch (error) {
      setMsg(getApiErrorFeedback(error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
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
        <p role="status" className="text-sm text-muted">
          {msg}
        </p>
      )}
    </form>
  );
}
