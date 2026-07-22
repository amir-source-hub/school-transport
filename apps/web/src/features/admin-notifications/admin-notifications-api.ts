import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationsSchema = z.array(notificationSchema);

export type AdminNotification = z.infer<typeof notificationSchema>;

const fallbackNotifications: AdminNotification[] = [
  { id: 'notif-001', title: 'ثبت‌نام جدید', message: 'یک درخواست ثبت‌نام جدید توسط خانواده احمدی ارسال شده است.', type: 'info', readAt: null, createdAt: '۱۴۰۴/۰۳/۱۵ ۱۰:۳۰' },
  { id: 'notif-002', title: 'یادآوری قیمت‌گذاری', message: 'قیمت‌گذاری برای دانش‌آموز امیر حسینی انجام نشده است.', type: 'warning', readAt: null, createdAt: '۱۴۰۴/۰۳/۱۴ ۰۹:۰۰' },
  { id: 'notif-003', title: 'پرداخت تأیید شد', message: 'پرداخت پیش‌پرداخت خانواده حسینی تأیید شد.', type: 'success', readAt: '۱۴۰۴/۰۳/۱۳ ۱۴:۰۰', createdAt: '۱۴۰۴/۰۳/۱۳ ۱۲:۰۰' },
  { id: 'notif-004', title: 'درخواست اصلاح', message: 'خانواده محمدی درخواست اصلاح اطلاعات را مشاهده کرده است.', type: 'info', readAt: null, createdAt: '۱۴۰۴/۰۳/۱۲ ۱۶:۴۵' },
];

export async function getAdminNotifications(): Promise<{ notifications: AdminNotification[] }> {
  try {
    const response = await apiRequest<unknown>('/notifications', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { notifications: notificationsSchema.parse(response.data) };
  } catch {
    return { notifications: fallbackNotifications };
  }
}
