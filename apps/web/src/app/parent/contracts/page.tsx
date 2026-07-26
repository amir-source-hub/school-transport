import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getContracts } from '@/features/finance/contracts-api';
import { formatIrr } from '@/lib/formatters';

export const metadata = { title: 'قراردادها' };
export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const contracts = await getContracts();
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل خانواده', href: '/parent/dashboard' }, { label: 'قراردادها' }]} />
      <div><p className="text-sm font-bold text-primary">قراردادهای دانش‌آموزان</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">قراردادها</h1></div>
      {contracts.length === 0 && <Card><p className="text-muted">هنوز قراردادی برای حساب شما صادر نشده است.</p></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-black">{contract.studentName} {contract.studentLastName}</h2><p className="text-sm text-muted">{contract.contractNumber} — نسخه {contract.versionNumber}</p></div>
              <Badge tone={contract.contractStatus === 'ACCEPTED' ? 'success' : contract.contractStatus === 'REJECTED' ? 'danger' : 'warning'}>{contract.contractStatus}</Badge>
            </div>
            <p className="mt-3 font-bold">{formatIrr(contract.totalAmount)}</p>
            <ButtonLink href={`/parent/contracts/${contract.id}`} variant="secondary" className="mt-5 w-full">مشاهده و اقدام</ButtonLink>
          </Card>
        ))}
      </div>
    </div>
  );
}
