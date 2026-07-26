import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ContractActions } from '@/features/finance/contract-actions';
import { getContract, getPaymentPlan } from '@/features/finance/contracts-api';
import { formatIrr } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

export default async function ContractPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const contract = await getContract(contractId);
  const payment = contract.paymentPlanId ? await getPaymentPlan(contract.paymentPlanId) : null;
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل خانواده', href: '/parent/dashboard' }, { label: 'قراردادها', href: '/parent/contracts' }, { label: contract.contractNumber }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-bold text-primary">نسخه {contract.versionNumber}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{contract.contractNumber}</h1><p className="text-sm text-muted">{contract.studentName} {contract.studentLastName}</p></div>
        <Badge tone={contract.contractStatus === 'ACCEPTED' ? 'success' : contract.contractStatus === 'REJECTED' ? 'danger' : 'warning'}>{contract.contractStatus}</Badge>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-muted">سال تحصیلی</p><p className="mt-2 font-black">{contract.academicYear}</p></Card>
        <Card><p className="text-sm text-muted">نوع سرویس</p><p className="mt-2 font-black">{contract.serviceType}</p></Card>
        <Card><p className="text-sm text-muted">مبلغ</p><p className="mt-2 font-black">{formatIrr(contract.totalAmount)}</p></Card>
      </section>
      <Card><h2 className="text-lg font-black">شرایط ثبت‌شده قرارداد</h2><pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm text-muted">{contract.contractDataSnapshot ?? 'جزئیات قرارداد ثبت نشده است.'}</pre></Card>
      {payment && <Card><h2 className="text-lg font-black">برنامه پرداخت</h2><div className="mt-4 space-y-2">{payment.items.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-3 border-b border-border py-3"><span>{item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : `قسط ${item.sequenceNumber}`}</span><strong>{formatIrr(item.amount)}</strong><Badge tone={item.itemStatus === 'PAID' ? 'success' : 'warning'}>{item.itemStatus}</Badge></div>)}</div></Card>}
      {contract.contractStatus === 'GENERATED' && <ContractActions id={contract.id} />}
    </div>
  );
}
