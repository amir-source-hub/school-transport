export type InvoiceStatus = "پرداخت‌شده" | "صادرشده" | "سررسید گذشته" | "لغوشده";

export const demoContract = {
  id: "demo-contract-one",
  studentId: "demo-student-one",
  studentName: "دانش‌آموز نمونه یک",
  number: "قرارداد نمایشی ۱",
  version: "نسخه نمایشی ۱",
  status: "در انتظار پذیرش خانواده",
  servicePeriod: "دوره خدمت نمونه",
  totalPrice: 150_000_000,
  paymentMethod: "پرداخت اقساطی",
  prepaymentAmount: 50_000_000,
  remainingAmount: 100_000_000,
  accepted: false,
} as const;

export const demoInvoices = [
  { id: "prepayment", title: "پیش‌پرداخت", amount: 50_000_000, dueDate: "سررسید نمایشی پیش‌پرداخت", status: "پرداخت‌شده" },
  { id: "installment-1", title: "قسط ماه اول", amount: 25_000_000, dueDate: "سررسید نمایشی ماه اول", status: "پرداخت‌شده" },
  { id: "installment-2", title: "قسط ماه دوم", amount: 25_000_000, dueDate: "سررسید نمایشی ماه دوم", status: "صادرشده" },
  { id: "installment-3", title: "قسط ماه سوم", amount: 25_000_000, dueDate: "سررسید نمایشی ماه سوم", status: "صادرشده" },
  { id: "installment-4", title: "قسط ماه چهارم", amount: 25_000_000, dueDate: "سررسید نمایشی ماه چهارم", status: "صادرشده" },
] as const satisfies readonly {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
}[];

export const demoPaymentOverview = {
  studentId: "demo-student-one",
  studentName: "دانش‌آموز نمونه یک",
  planStatus: "فعال",
  paidAmount: 75_000_000,
  remainingAmount: 75_000_000,
  nextPayment: "قسط ماه دوم",
  verificationStatus: "در انتظار نتیجه قطعی نیست",
  offlineSubmissions: [
    {
      id: "offline-demo-one",
      invoice: "قسط ماه دوم",
      amount: 25_000_000,
      status: "در انتظار بررسی مدیریت",
      reference: "مرجع نمایشی",
    },
  ],
} as const;
