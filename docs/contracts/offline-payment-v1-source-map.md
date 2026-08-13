# Offline payment contract v1 source map

Authoritative originals (preserved unchanged): `__صفحه اول_.docx` SHA-256 `51C5B2FB903D8D02DA7805F71031DDE51FD76B21FAB06B0A68FE601422DB1E98`; `__صفحه دوم و سوم_.docx` SHA-256 `D09E72DA64F698EA8E0E9D0ACB45B247798B3A1E99D03338388FB8C50388E1F6`.

Application template: `offline-fa-1405-v1`. Logical page 1 is the first source. Logical page 2 is paragraphs 1–26 of the second source; Word's stored `lastRenderedPageBreak` places logical page 3 at paragraph 27. The runtime never reads either Word file.

No legal wording was intentionally rewritten. Typography-only normalization: spaces were inserted at visually joined blank boundaries; Persian punctuation and half-spacing were normalized only around populated fields; obvious source spelling is otherwise retained. LibreOffice is unavailable in the current Windows runtime, so 100% visual comparison remains a legal/product release gate.

| Binding | Persian label | Authoritative source | Rule |
| --- | --- | --- | --- |
| guardianFullName | نام اولیاء/سرپرست | primary `GUARDIAN` enrollment parent | required; plain text; 200 chars |
| guardianRole | نسبت سرپرست | guardian relationship type/description | required; Persian label |
| studentFullName | نام دانش‌آموز | student snapshot | required; plain text; 200 chars |
| studentNationalId | کد ملی دانش‌آموز | student snapshot | required string; leading zeros retained |
| educationLevel / grade / fieldOfStudy | مقطع / پایه / رشته | selected school enrollment | level and grade required; field optional, fallback `ندارد` |
| academicYear | سال تحصیلی | service registration | required string |
| serviceAmount* | مبلغ | accepted registration price | required IRR, toman, and words; v1 source amount is 49,978,000 IRR |
| paymentState | وضعیت پرداخت | payment plan/schedule snapshot | required Persian status |
| homeAddress / postalCode / homePhone | نشانی / کد پستی / تلفن منزل | selected family address and guardian | required strings; leading zeros retained |
| fatherMobile / motherMobile | همراه پدر / مادر | guardian when matching role, otherwise parent snapshot | optional; fallback `ثبت نشده` |
| emergencyPhone | تلفن ضروری | emergency contact snapshot | optional; fallback `ثبت نشده` |
| schoolName | مدرسه | selected school | required |
| serviceType | نوع سرویس | service registration | required Persian label |
| contractStartDate / decisionDeadline | تاریخ شروع / مهلت تصمیم | approved v1 legal dates | required Jalali strings (`1405/07/01`, `1405/06/15`) |
| generatedDate | تاریخ صدور | contract generation timestamp | required Jalali string |

All values are normalized as bounded plain text. Required missing values block generation with `INCOMPLETE_CONTRACT_DATA`; React and downloadable HTML escape values on output. Accepted snapshots retain the resolved bindings and all three rendered pages.
