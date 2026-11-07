import Link from 'next/link';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api-client';
import { contractSchema } from '@/features/finance/contracts-api';

export const metadata = { title: 'قرارداد دانش‌آموز' };
export const dynamic = 'force-dynamic';

export default async function AdminContractPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const response = await apiRequest<unknown>(`/admin/contracts/${contractId}`, { cache: 'no-store' });
  const contract = contractSchema.parse(response.data);
  let pages: string[][] = [];
  let contractText = '';
  try {
    const snapshot = JSON.parse(contract.contractDataSnapshot ?? '{}') as { pages?: unknown; contractText?: unknown };
    if (Array.isArray(snapshot.pages) && snapshot.pages.every((page) => Array.isArray(page) && page.every((part) => typeof part === 'string'))) pages = snapshot.pages as string[][];
    if (typeof snapshot.contractText === 'string') contractText = snapshot.contractText;
  } catch { contractText = contract.contractDataSnapshot ?? ''; }
  return <div className="space-y-6">
    <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'دانش‌آموزان', href: '/admin/students' }, { label: contract.contractNumber }]} />
    <header><h1 className="text-2xl font-black">قرارداد {contract.contractNumber}</h1><p>{contract.studentName} {contract.studentLastName} · نسخه {contract.versionNumber} · {contract.contractStatus === 'ACCEPTED' ? 'امضاشده' : contract.contractStatus}</p></header>
    {pages.length ? pages.map((page, index) => <Card key={index}><h2 className="mb-4 font-bold">صفحه {index + 1}</h2><div className="space-y-3 leading-8">{page.map((part, partIndex) => <p key={partIndex}>{part}</p>)}</div></Card>) : <Card><pre className="whitespace-pre-wrap font-sans leading-8">{contractText || 'متن قرارداد موجود نیست.'}</pre></Card>}
    <Link href="/admin/students" className="text-primary underline">بازگشت به دانش‌آموزان</Link>
  </div>;
}
