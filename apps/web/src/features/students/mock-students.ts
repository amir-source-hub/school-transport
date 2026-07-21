export const demoStudents = [
  {
    id: "demo-student-one",
    firstName: "دانش‌آموز",
    lastName: "نمونه یک",
    fatherName: "نام نمونه پدر",
    nationalId: "۰۰۱۲۳۴۵۶۷۸",
    homeAddress: "نشانی نمایشی خانواده",
    school: "مدرسه پس از اتصال داده نمایش داده می‌شود",
    grade: "پایه پس از اتصال داده نمایش داده می‌شود",
    academicYear: "سال تحصیلی نمونه",
    status: "در حال بررسی",
  },
  {
    id: "demo-student-two",
    firstName: "دانش‌آموز",
    lastName: "نمونه دو",
    fatherName: "نام نمونه پدر",
    nationalId: "۰۰۱۲۳۴۵۶۷۹",
    homeAddress: "نشانی نمایشی خانواده",
    school: "مدرسه پس از اتصال داده نمایش داده می‌شود",
    grade: "پایه پس از اتصال داده نمایش داده می‌شود",
    academicYear: "سال تحصیلی نمونه",
    status: "نیازمند اصلاح",
  },
] as const;

export const getDemoStudent = (studentId: string) =>
  demoStudents.find(({ id }) => id === studentId);
