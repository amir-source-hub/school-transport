import { describe, expect, it } from 'vitest';
import {
  OFFLINE_CONTRACT_TEMPLATE_HASH,
  OFFLINE_CONTRACT_TEMPLATE_VERSION,
  renderOfflineContract,
  type OfflineContractBindings,
} from './offline-contract-template';

const bindings: OfflineContractBindings = {
  guardianFullName: 'زهرا کاظمی',
  guardianRole: 'خاله',
  studentFullName: 'علی احمدی',
  studentNationalId: '0023518805',
  educationLevel: 'ابتدایی',
  grade: 'اول',
  fieldOfStudy: 'ندارد',
  academicYear: '1405–1406',
  serviceAmountRial: '۴۹٬۹۷۸٬۰۰۰',
  serviceAmountToman: '۴٬۹۹۷٬۸۰۰',
  serviceAmountTomanWords: 'چهار میلیون و نهصد و نود و هفت هزار و هشتصد',
  paymentState: 'در انتظار پرداخت',
  homeAddress: 'تهران، خیابان آزادی',
  postalCode: '0123456789',
  homePhone: '02122113333',
  fatherMobile: '09121111111',
  motherMobile: '09122222222',
  emergencyPhone: '09123333333',
  schoolName: 'مدرسه نمونه',
  serviceType: 'ون',
  contractStartDate: '1405/07/01',
  decisionDeadline: '1405/06/15',
  generatedDate: '1405/05/20',
};

describe('offline contract template', () => {
  it('renders exactly three ordered pages with no unresolved placeholders', () => {
    const result = renderOfflineContract(bindings);
    expect(result.templateVersion).toBe(OFFLINE_CONTRACT_TEMPLATE_VERSION);
    expect(result.templateHash).toBe(OFFLINE_CONTRACT_TEMPLATE_HASH);
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0][0]).toContain('فرم قرارداد');
    expect(result.pages[1][0]).toBe('موضوع قرارداد:');
    expect(result.pages[2][0]).toContain('تبصره 2');
    expect(result.pages.flat().join('\n')).not.toMatch(/\{\{\w+\}\}/);
  });

  it('preserves leading-zero identifiers and removes markup from bounded values', () => {
    const result = renderOfflineContract({
      ...bindings,
      guardianFullName: '<script>alert(1)</script>',
    });
    const text = result.pages.flat().join('\n');
    expect(text).toContain('0023518805');
    expect(text).toContain('0123456789');
    expect(text).not.toContain('<script>');
  });

  it('blocks a missing required legal value in Persian', () => {
    expect(() => renderOfflineContract({ ...bindings, postalCode: '' })).toThrow(
      'اطلاعات الزامی قرارداد ناقص است',
    );
  });
});
