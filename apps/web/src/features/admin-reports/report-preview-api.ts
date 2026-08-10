import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const reportSections = [
  { value: 'students', label: 'دانش‌آموزان' },
  { value: 'families', label: 'خانواده‌ها و نشانی‌ها' },
  { value: 'registrations', label: 'ثبت‌نام‌ها' },
  { value: 'payments', label: 'پرداخت‌ها' },
  { value: 'contracts', label: 'قراردادها' },
] as const;
export type ReportSection = (typeof reportSections)[number]['value'];

const previewSchema = z.object({
  section: z.enum(['students', 'families', 'registrations', 'payments', 'contracts']),
  columns: z.array(
    z.object({ key: z.string(), label: z.string(), kind: z.enum(['money', 'date']).optional() }),
  ),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
  }),
  totals: z.record(z.string(), z.number()),
});

export type ReportPreview = z.infer<typeof previewSchema>;

export async function getReportPreview(section: ReportSection, page: number, pageSize = 10) {
  const query = new URLSearchParams({ section, page: String(page), pageSize: String(pageSize) });
  const response = await apiRequest<unknown>(`/admin/reports/comprehensive/preview?${query}`, {
    cache: 'no-store',
  });
  return previewSchema.parse(response.data);
}
