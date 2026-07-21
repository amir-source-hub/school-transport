export type RegistrationStatus = "ارسال‌شده" | "در حال بررسی" | "نیازمند اصلاح" | "تأییدشده" | "ردشده" | "در انتظار قیمت";

export const demoRegistrations = [
  { id: "registration-001", trackingCode: "پیگیری-۰۰۱", student: "دانش‌آموز نمونه یک", family: "خانواده نمونه یک", school: "مدرسه نمونه الف", status: "در حال بررسی", nextAction: "تصمیم مدیریت" },
  { id: "registration-002", trackingCode: "پیگیری-۰۰۲", student: "دانش‌آموز نمونه دو", family: "خانواده نمونه دو", school: "مدرسه نمونه ب", status: "ارسال‌شده", nextAction: "شروع بررسی" },
  { id: "registration-003", trackingCode: "پیگیری-۰۰۳", student: "دانش‌آموز نمونه سه", family: "خانواده نمونه سه", school: "مدرسه نمونه الف", status: "نیازمند اصلاح", nextAction: "انتظار برای خانواده" },
  { id: "registration-004", trackingCode: "پیگیری-۰۰۴", student: "دانش‌آموز نمونه چهار", family: "خانواده نمونه چهار", school: "مدرسه نمونه ج", status: "تأییدشده", nextAction: "ثبت قیمت" },
  { id: "registration-005", trackingCode: "پیگیری-۰۰۵", student: "دانش‌آموز نمونه پنج", family: "خانواده نمونه پنج", school: "مدرسه نمونه ب", status: "ردشده", nextAction: "مشاهده سابقه" },
  { id: "registration-006", trackingCode: "پیگیری-۰۰۶", student: "دانش‌آموز نمونه شش", family: "خانواده نمونه شش", school: "مدرسه نمونه ج", status: "در انتظار قیمت", nextAction: "ثبت قیمت" },
] as const satisfies readonly {
  id: string; trackingCode: string; student: string; family: string; school: string; status: RegistrationStatus; nextAction: string;
}[];

export const registrationStatuses = ["همه", "ارسال‌شده", "در حال بررسی", "نیازمند اصلاح", "تأییدشده", "ردشده", "در انتظار قیمت"] as const;

export const getDemoRegistration = (id: string) => demoRegistrations.find((item) => item.id === id);

export const getRegistrationTone = (status: RegistrationStatus) => {
  if (status === "تأییدشده") return "success" as const;
  if (status === "ردشده") return "danger" as const;
  if (status === "نیازمند اصلاح" || status === "ارسال‌شده" || status === "در حال بررسی" || status === "در انتظار قیمت") return "warning" as const;
  return "neutral" as const;
};
