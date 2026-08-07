import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateEnrollmentForm } from './enrollment-actions';

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const enrollmentApi = vi.hoisted(() => ({
  createGuidedEnrollment: vi.fn(),
  acceptGuidedContract: vi.fn(),
  payGuidedPrepayment: vi.fn(),
  finalizeOnboarding: vi.fn(),
  cancelEnrollment: vi.fn(),
  acceptEnrollmentPrice: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, refresh: navigation.refresh }),
}));
vi.mock('./enrollments-api', () => enrollmentApi);
vi.mock('leaflet', () => ({}));

const schools = [
  {
    id: 'school-1',
    name: 'دبستان مجتمع',
    city: 'تهران',
    educationOptions: [{ level: 'پایه هفتم', grades: ['هفتم'] }],
  },
];

function renderOnboarding() {
  return render(
    <CreateEnrollmentForm
      mode="onboarding"
      schools={schools}
      savedParents={{ father: null, mother: null }}
      existingStudents={[]}
      defaults={{
        address: {
          title: 'منزل',
          province: 'تهران',
          city: 'تهران',
          streetAddress: 'خیابان آزادی، پلاک ۱',
          postalCode: '1111111221',
          latitude: 35.7,
          longitude: 51.3,
        },
        emergencyContact: {
          firstName: 'مریم',
          lastName: 'رضایی',
          relationship: 'مادر',
          phoneNumber: '09121112222',
        },
      }}
    />,
  );
}

const section = (title: string) =>
  screen.getByRole('heading', { name: title }).closest('section') as HTMLElement;

const fillIn = (
  user: ReturnType<typeof userEvent.setup>,
  sectionTitle: string,
  label: string,
  value: string,
) => user.type(within(section(sectionTitle)).getByLabelText(label), value);

describe('onboarding guided enrollment funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enrollmentApi.createGuidedEnrollment.mockResolvedValue({
      registrationId: 'reg-1',
      studentId: 'std-1',
      contractId: 'contract-1',
      scheduleItemId: 'sch-1',
      prepaymentAmount: 4_000_000,
      contractText: 'متن قرارداد سرویس مدرسه.\nبندهای کافی برای اسکرول.'.repeat(5),
    });
  });

  it('drives a new account through enrollment, contract, prepayment and finalize', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await fillIn(user, 'مشخصات دانش‌آموز', 'شماره تلفن منزل', '22113333');
    await fillIn(user, 'مشخصات دانش‌آموز', 'نام دانش‌آموز', 'علی');
    await fillIn(user, 'مشخصات دانش‌آموز', 'نام خانوادگی', 'احمدی');
    await fillIn(user, 'مشخصات دانش‌آموز', 'کد ملی', '1234567891');
    await fillIn(user, 'سرپرست', 'نام', 'حسین');
    await fillIn(user, 'سرپرست', 'نام خانوادگی', 'احمدی');
    await fillIn(user, 'سرپرست', 'کد ملی', '1234567891');
    await user.click(within(section('سرپرست')).getByRole('combobox', { name: 'نسبت' }));
    await user.click(await screen.findByRole('option', { name: 'پدر' }));
    await fillIn(user, 'اطلاعات پدر', 'نام', 'حسین');
    await fillIn(user, 'اطلاعات پدر', 'نام خانوادگی', 'احمدی');
    await fillIn(user, 'اطلاعات پدر', 'کد ملی', '1234567891');
    await fillIn(user, 'اطلاعات پدر', 'شماره همراه', '09123456789');
    await fillIn(user, 'اطلاعات مادر', 'نام', 'مریم');
    await fillIn(user, 'اطلاعات مادر', 'نام خانوادگی', 'رضایی');
    await fillIn(user, 'اطلاعات مادر', 'کد ملی', '1234567891');
    await fillIn(user, 'اطلاعات مادر', 'شماره همراه', '09129998877');
    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));

    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));
    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));

    await user.click(screen.getByRole('button', { name: /مشاهده قرارداد/ }));

    await waitFor(() =>
      expect(enrollmentApi.createGuidedEnrollment).toHaveBeenCalledWith(
        expect.objectContaining({
          student: expect.objectContaining({ firstName: 'علی' }),
        }),
        'onboarding',
      ),
    );

    const contract = document.querySelector('[class*="overflow-y-auto"]') as HTMLElement;
    fireEvent.scroll(contract);
    await user.click(screen.getByLabelText(/تمام بندهای قرارداد را مطالعه/));
    await user.click(screen.getByRole('button', { name: /پذیرش قرارداد و ادامه/ }));

    await user.click(screen.getByRole('button', { name: /پرداخت امن و تکمیل ثبت‌نام/ }));

    expect(enrollmentApi.acceptGuidedContract).toHaveBeenCalledWith('contract-1', 'onboarding');
    expect(enrollmentApi.payGuidedPrepayment).toHaveBeenCalledWith('sch-1', 'onboarding');
    expect(enrollmentApi.finalizeOnboarding).toHaveBeenCalledOnce();
    expect(navigation.replace).toHaveBeenCalledWith('/parent/dashboard');
  });
});