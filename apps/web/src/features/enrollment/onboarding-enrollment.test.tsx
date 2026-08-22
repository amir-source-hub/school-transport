import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateEnrollmentForm } from './enrollment-actions';
import { clearOnboardingState, setOnboardingState } from '@/features/auth/onboarding-session';

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const enrollmentApi = vi.hoisted(() => ({
  createGuidedEnrollment: vi.fn(),
  acceptGuidedContract: vi.fn(),
  finalizeOnboarding: vi.fn(),
  cancelEnrollment: vi.fn(),
  acceptEnrollmentPrice: vi.fn(),
}));
const notificationsApi = vi.hoisted(() => ({ updateNotificationConsent: vi.fn() }));
const paymentsApi = vi.hoisted(() => ({
  getOfflineDestination: vi.fn(),
  submitOfflinePayment: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, refresh: navigation.refresh }),
}));
vi.mock('./enrollments-api', () => enrollmentApi);
vi.mock('@/features/finance/payments-api', () => paymentsApi);
vi.mock('@/features/notifications/notifications-api', () => notificationsApi);
vi.mock('@/features/student-photos/photo-upload-card', () => ({
  PhotoUploadCard: ({ onUploadCompleted }: { onUploadCompleted?: (id: string) => void }) => (
    <button type="button" onClick={() => onUploadCompleted?.('photo-upload-1')}>
      ثبت عکس آزمایشی
    </button>
  ),
}));
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

function renderOnboardingWithoutCoordinates() {
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

async function fillBirthDate(user: ReturnType<typeof userEvent.setup>) {
  const studentSection = within(section('مشخصات دانش‌آموز'));
  await user.type(studentSection.getByLabelText('سال'), '1395');
  await user.type(studentSection.getByLabelText('ماه'), '01');
  await user.type(studentSection.getByLabelText('روز'), '01');
}

describe('onboarding guided enrollment funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOnboardingState();
    enrollmentApi.finalizeOnboarding.mockRejectedValue(new Error('ثبت‌نام هنوز آماده پنل نیست'));
    enrollmentApi.createGuidedEnrollment.mockResolvedValue({
      registrationId: 'reg-1',
      studentId: 'std-1',
      contractId: 'contract-1',
      scheduleItemId: 'sch-1',
      prepaymentAmount: 4_000_000,
      contractText: 'متن قرارداد سرویس مدرسه.\nبندهای کافی برای اسکرول.'.repeat(5),
      contractTemplateHash: 'template-hash-1',
      contractPages: [['صفحه اول'], ['صفحه دوم'], ['صفحه سوم']],
    });
    paymentsApi.getOfflineDestination.mockResolvedValue({
      id: 'destination-1',
      version: 1,
      accountOwner: 'شرکت سرویس مدرسه',
      bankName: 'بانک نمونه',
      cardNumber: '6037991234567890',
      iban: null,
      accountNumber: null,
      instructions: 'پس از واریز، رسید را ثبت کنید.',
    });
  });

  it('shows and preserves the locked registration identity when relationship changes', async () => {
    setOnboardingState({
      sessionId: 'onboarding-1',
      phoneNumber: '09126546078',
      nationalId: '0499370899',
      expiresAt: '2026-09-01T00:00:00.000Z',
      currentStep: null,
    });
    const user = userEvent.setup();
    renderOnboarding();
    const guardian = within(section('سرپرست'));

    expect(guardian.getByLabelText('کد ملی')).toHaveValue('0499370899');
    expect(guardian.getByLabelText('کد ملی')).toBeDisabled();
    expect(guardian.getByLabelText('شماره همراه سرپرست')).toHaveValue('09126546078');

    await user.click(guardian.getByRole('combobox', { name: 'نسبت' }));
    await user.click(await screen.findByRole('option', { name: 'مادر' }));

    expect(guardian.getByLabelText('کد ملی')).toHaveValue('0499370899');
    expect(guardian.getByLabelText('شماره همراه سرپرست')).toHaveValue('09126546078');
    expect(guardian.getByLabelText('نام', { exact: true })).toHaveValue('');
  });

  it('drives a new account through enrollment and contract to the offline receipt step', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await fillIn(user, 'سرپرست', 'شماره تلفن منزل', '22113333');
    await fillIn(user, 'مشخصات دانش‌آموز', 'نام دانش‌آموز', 'علی');
    await fillIn(user, 'مشخصات دانش‌آموز', 'نام خانوادگی', 'احمدی');
    await fillIn(user, 'مشخصات دانش‌آموز', 'نام پدر', 'حسین');
    await fillIn(user, 'مشخصات دانش‌آموز', 'کد ملی دانش‌آموز', '0013540394');
    await fillBirthDate(user);
    await user.click(within(section('مشخصات دانش‌آموز')).getByRole('combobox', { name: 'جنسیت' }));
    await user.click(await screen.findByRole('option', { name: 'پسر' }));
    await user.click(within(section('سرپرست')).getByRole('combobox', { name: 'نسبت' }));
    await user.click(await screen.findByRole('option', { name: 'پدر' }));
    await fillIn(user, 'سرپرست', 'نام', 'حسین');
    await fillIn(user, 'سرپرست', 'نام خانوادگی', 'احمدی');
    await fillIn(user, 'سرپرست', 'کد ملی', '0499370899');
    await fillIn(user, 'اطلاعات مادر', 'نام', 'سارا');
    await fillIn(user, 'اطلاعات مادر', 'نام خانوادگی', 'کریمی');
    await fillIn(user, 'اطلاعات مادر', 'کد ملی', '0067749811');
    await fillIn(user, 'اطلاعات مادر', 'شماره همراه', '09129998877');
    await user.click(screen.getByRole('button', { name: 'ثبت عکس آزمایشی' }));
    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));

    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));
    await user.click(screen.getByRole('combobox', { name: 'نام مدرسه' }));
    await user.click(await screen.findByRole('option', { name: /دبستان مجتمع/ }));
    await user.click(screen.getByRole('combobox', { name: 'مقطع تحصیلی' }));
    await user.click(await screen.findByRole('option', { name: 'پایه هفتم' }));
    await user.click(screen.getByRole('combobox', { name: 'پایه تحصیلی' }));
    await user.click(await screen.findByRole('option', { name: 'هفتم' }));
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

    await user.click(screen.getByRole('button', { name: 'صفحه بعد' }));
    await user.click(screen.getByRole('button', { name: 'صفحه بعد' }));
    await user.click(screen.getByRole('button', { name: /پذیرش قرارداد و ادامه/ }));

    expect(enrollmentApi.acceptGuidedContract).toHaveBeenCalledWith(
      'contract-1',
      'template-hash-1',
      [1, 2, 3],
      'onboarding',
    );
    expect(screen.getByText('۴٬۹۹۷٬۸۰۰')).toBeInTheDocument();
    expect(await screen.findByText('6037991234567890')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ارسال رسید برای بررسی مدیر' })).toBeNull();
    const enterPanel = screen.getByRole('button', {
      name: 'تأیید اطلاعات پرداخت و ورود به پنل خانواده',
    });
    expect(enterPanel).toBeEnabled();
    expect(navigation.replace).not.toHaveBeenCalledWith('/student/dashboard');
    enrollmentApi.finalizeOnboarding.mockResolvedValue(undefined);
    await user.click(enterPanel);
    await waitFor(() => expect(enrollmentApi.finalizeOnboarding).toHaveBeenCalled());
    expect(navigation.replace).toHaveBeenCalledWith('/student/dashboard');
  }, 30_000);

  it('routes a returning accepted enrollment directly to the saved family panel', async () => {
    enrollmentApi.finalizeOnboarding.mockResolvedValue(undefined);
    renderOnboarding();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/student/dashboard'));
  });

  it('rejects pasted extra digits in prefix fields instead of truncating them', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    const homePhoneInput = within(section('سرپرست')).getByLabelText('شماره تلفن منزل');
    await user.clear(homePhoneInput);
    await user.paste('2211333344');
    expect(homePhoneInput).toHaveValue('');
    await screen.findByText('شماره تلفن منزل باید شامل پیششماره ۰۲۱ و ۸ رقم باشد.');

    const studentPhoneInput = within(section('مشخصات دانش‌آموز')).getByLabelText(
      'شماره همراه دانش‌آموز',
    );
    await user.clear(studentPhoneInput);
    await user.paste('12345678901');
    expect(studentPhoneInput).toHaveValue('');
    await screen.findByText('شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.');
  }, 30_000);

  it('requires an explicit location on the map before leaving the address step', async () => {
    const user = userEvent.setup();
    renderOnboardingWithoutCoordinates();

    await fillIn(user, 'سرپرست', 'شماره تلفن منزل', '22113333');
    await fillIn(user, 'مشخصات دانش‌آموز', 'نام دانش‌آموز', 'علی');
    await fillIn(user, 'مشخصات دانش‌آموز', 'نام خانوادگی', 'احمدی');
    await fillIn(user, 'مشخصات دانش‌آموز', 'نام پدر', 'حسین');
    await fillIn(user, 'مشخصات دانش‌آموز', 'کد ملی دانش‌آموز', '0013540394');
    await fillBirthDate(user);
    await user.click(within(section('مشخصات دانش‌آموز')).getByRole('combobox', { name: 'جنسیت' }));
    await user.click(await screen.findByRole('option', { name: 'پسر' }));
    await user.click(within(section('سرپرست')).getByRole('combobox', { name: 'نسبت' }));
    await user.click(await screen.findByRole('option', { name: 'پدر' }));
    await fillIn(user, 'سرپرست', 'نام', 'حسین');
    await fillIn(user, 'سرپرست', 'نام خانوادگی', 'احمدی');
    await fillIn(user, 'سرپرست', 'کد ملی', '0499370899');
    await fillIn(user, 'اطلاعات مادر', 'نام', 'سارا');
    await fillIn(user, 'اطلاعات مادر', 'نام خانوادگی', 'کریمی');
    await fillIn(user, 'اطلاعات مادر', 'کد ملی', '0067749811');
    await fillIn(user, 'اطلاعات مادر', 'شماره همراه', '09129998877');
    await user.click(screen.getByRole('button', { name: 'ثبت عکس آزمایشی' }));
    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));

    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));
    expect(
      await screen.findByText('نشانی کامل، کد پستی ۱۰ رقمی معتبر و موقعیت مکانی را وارد کنید.'),
    ).toBeInTheDocument();
    expect(screen.getByText('نشانی محل سوار شدن')).toBeInTheDocument();

    const latitudeInput = screen.getByLabelText('عرض جغرافیایی');
    fireEvent.change(latitudeInput, { target: { value: '35.7225' } });
    fireEvent.blur(latitudeInput);
    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));
    expect(screen.getByText('مدرسه')).toBeInTheDocument();
  }, 30_000);
});
