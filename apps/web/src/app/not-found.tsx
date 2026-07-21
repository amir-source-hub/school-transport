import { PageContainer } from '@/components/common/page-container';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <PageContainer className="py-24 text-center">
      <p className="text-sm font-bold text-primary">خطای ۴۰۴</p>
      <h1 className="mt-2 text-3xl font-black">صفحه موردنظر پیدا نشد</h1>
      <p className="mt-3 text-muted">ممکن است نشانی صفحه تغییر کرده باشد.</p>
      <ButtonLink href="/" className="mt-7">
        بازگشت به صفحه اصلی
      </ButtonLink>
    </PageContainer>
  );
}
