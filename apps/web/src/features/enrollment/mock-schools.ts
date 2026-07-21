export const demoEnrollmentSchools = [
  {
    id: 'school-demo-1',
    name: 'مدرسه نمونه یک',
    branch: 'شعبه مرکزی نمایشی',
    levels: [
      { name: 'متوسطه اول', grades: ['هفتم', 'هشتم', 'نهم'] },
      { name: 'متوسطه دوم', grades: ['دهم', 'یازدهم', 'دوازدهم'] },
    ],
  },
  {
    id: 'school-demo-2',
    name: 'مدرسه نمونه دو',
    branch: 'بدون شعبه',
    levels: [{ name: 'متوسطه اول', grades: ['هفتم', 'هشتم', 'نهم'] }],
  },
] as const;

export const demoAcademicYear = 'سال تحصیلی فعال نمایشی';
