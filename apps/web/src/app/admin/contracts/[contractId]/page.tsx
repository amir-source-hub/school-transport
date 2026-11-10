import Link from 'next/link';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { apiRequest } from '@/lib/api-client';
import { contractSchema } from '@/features/finance/contracts-api';
import { ContractReview } from '@/features/finance/contract-review';

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
    {pages.length ? <ContractReview contractId={contractId} version={contract.versionNumber} templateHash="admin-view" pages={pages} canAct={false} /> : <ContractReview contractId={contractId} version={contract.versionNumber} templateHash="admin-view" pages={[[contractText || 'متن قرارداد موجود نیست.']]} canAct={false} />}
    <Link href="/admin/students" className="text-primary underline">بازگشت به دانش‌آموزان</Link>
  </div>;
}
