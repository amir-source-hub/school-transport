# Work F — Enrollment field matrix

This matrix is the single source of truth for the enrollment contract. Every UI field, API input,
DTO rule, and persistence destination must match it. Update this file first, then implement.

Notation:

- **Path** — stable JSON path sent to `/enrollments` (guided). Backend validation errors use this exact path, e.g. `guardian.nationalId`.
- **DB** — destination table.column. `(new)` marks a column created by the Work F migration.
- **Frontend** — rule enforced by the shared schema in `enrollment-schema.ts` before submit and on blur.
- **Backend** — rule enforced by `class-validator` DTOs (already Persian-messaged) and service code.

## Guardian (new, required) — replaces mandatory father/mother

| Path                               | DB                                              | Label              | Required              | Normalization                 | Frontend rule                             | Backend rule                                 | Persian error messages                         |
| ---------------------------------- | ----------------------------------------------- | ------------------ | --------------------- | ----------------------------- | ----------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| `guardian.firstName`               | parents.first_name (`parent_type = 'GUARDIAN'`) | نام                | always                | Persian text                  | Persian text, 1–100                       | IsString + Length(1,100)                     | نام باید بین ۱ تا ۱۰۰ نویسه باشد.              |
| `guardian.lastName`                | parents.last_name                               | نام خانوادگی       | always                | Persian text                  | Persian text, 1–100                       | IsString + Length(1,100)                     | نام خانوادگی باید بین ۱ تا ۱۰۰ نویسه باشد.     |
| `guardian.nationalId`              | parents.national_id                             | کد ملی             | always                | Persian/Arabic → Latin digits | numeric string 1–10 digits, no checksum   | `^\d{1,10}$` (shared `isIranianNationalId`)  | کد ملی باید فقط عدد و حداکثر ۱۰ رقم باشد.      |
| `guardian.phoneNumber`             | parents.phone_number                            | شماره همراه سرپرست | always (from session) | Persian/Arabic → Latin digits | read-only, `^09\d{9}$`                    | from onboarding context; reject client value | شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد. |
| `guardian.relationshipType`        | parents.relationship_type `(new)`               | نسبت               | always                | —                             | `FATHER \| MOTHER \| OTHER`               | `IsIn(['FATHER','MOTHER','OTHER'])`          | نسبت باید پدر، مادر یا سایر باشد.              |
| `guardian.relationshipDescription` | parents.relationship_description `(new)`        | شرح نسبت           | only when `OTHER`     | Persian text                  | required iff `OTHER`; Persian text, 1–100 | required iff `OTHER`; Length(1,100)          | شرح نسبت را وارد کنید.                         |

The guardian row is stored as `parents.parent_type = 'GUARDIAN'` (new value alongside the existing
`FATHER`/`MOTHER` optional rows), so `relationshipType` maps to the new `parents.relationship_type`
column. One `GUARDIAN` row per user, enforced by the existing `(user_id, parent_type)` unique index.

The guardian `phoneNumber` is the phone verified during login/onboarding. The client renders it
read-only; the backend derives it from the onboarding session and ignores any supplied value.

## Optional contacts (father, mother, emergency)

Blank sections are sent as `null`/`undefined`. If any field in a section is entered, the whole
section becomes required (minimum coherent set) and errors appear only in that section.

| Path                            | DB                              | Label            | Required | Normalization  | Frontend rule       | Backend rule  | Persian error messages                             |
| ------------------------------- | ------------------------------- | ---------------- | -------- | -------------- | ------------------- | ------------- | -------------------------------------------------- |
| `father.firstName`              | parents.first_name (`FATHER`)   | نام پدر          | section  | Persian text   | Persian text, 1–100 | Length(1,100) | نام پدر باید بین ۱ تا ۱۰۰ نویسه باشد.              |
| `father.lastName`               | parents.last_name               | نام خانوادگی پدر | section  | Persian text   | Persian text, 1–100 | Length(1,100) | نام خانوادگی پدر باید بین ۱ تا ۱۰۰ نویسه باشد.     |
| `father.nationalId`             | parents.national_id             | کد ملی پدر       | section  | digits         | numeric 1–10 digits | `^\d{1,10}$`  | کد ملی پدر باید فقط عدد و حداکثر ۱۰ رقم باشد.      |
| `father.phoneNumber`            | parents.phone_number            | شماره همراه پدر  | section  | digits         | `^09\d{9}$`         | `^09\d{9}$`   | شماره همراه پدر باید با ۰۹ شروع شود و ۱۱ رقم باشد. |
| `mother.*`                      | parents.* (`MOTHER`)            | (مادر)           | section  | same as father | same                | same          | (پیامهای مشابه با «مادر»)                          |
| `emergencyContact.firstName`    | emergency_contacts.first_name   | نام              | section  | Persian text   | Persian text, 1–100 | Length(1,100) | نام باید بین ۱ تا ۱۰۰ نویسه باشد.                  |
| `emergencyContact.lastName`     | emergency_contacts.last_name    | نام خانوادگی     | section  | Persian text   | Persian text, 1–100 | Length(1,100) | نام خانوادگی باید بین ۱ تا ۱۰۰ نویسه باشد.         |
| `emergencyContact.relationship` | emergency_contacts.relationship | نسبت             | section  | Persian text   | Persian text, 1–50  | Length(1,50)  | نسبت باید بین ۱ تا ۵۰ نویسه باشد.                  |
| `emergencyContact.phoneNumber`  | emergency_contacts.phone_number | شماره همراه      | section  | digits         | `^09\d{9}$`         | `^09\d{9}$`   | شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.     |

## Student

| Path                  | DB                            | Label                 | Required              | Normalization                | Frontend rule        | Backend rule              | Persian error messages                         |
| --------------------- | ----------------------------- | --------------------- | --------------------- | ---------------------------- | -------------------- | ------------------------- | ---------------------------------------------- |
| `student.id`          | students.id                   | دانشآموز موجود        | when editing existing | UUID                         | UUID                 | IsUUID                    | شناسه دانشآموز معتبر نیست.                     |
| `student.firstName`   | students.first_name           | نام دانشآموز          | always                | Persian text                 | Persian text, 1–100  | IsString + Length(1,100)  | نام باید بین ۱ تا ۱۰۰ نویسه باشد.              |
| `student.lastName`    | students.last_name            | نام خانوادگی دانشآموز | always                | Persian text                 | Persian text, 1–100  | IsString + Length(1,100)  | نام خانوادگی باید بین ۱ تا ۱۰۰ نویسه باشد.     |
| `student.nationalId`  | students.national_id          | کد ملی دانشآموز       | always                | digits                       | numeric 1–10 digits  | `^\d{1,10}$`              | کد ملی باید فقط عدد و حداکثر ۱۰ رقم باشد.      |
| `student.birthDate`   | students.birth_date           | تاریخ تولد            | always                | Jalali picker → `YYYY-MM-DD` | required, valid date | IsDateString(strict)      | تاریخ تولد را انتخاب کنید.                     |
| `student.gender`      | students.gender               | جنسیت                 | always                | —                            | `MALE \| FEMALE`     | `IsIn(['MALE','FEMALE'])` | جنسیت باید پسر یا دختر باشد.                   |
| `student.phoneNumber` | students.phone_number `(new)` | شماره همراه دانشآموز  | optional              | digits                       | `^09\d{9}$`          | `^09\d{9}$`               | شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد. |

## Home phone (new)

| Path        | DB                         | Label           | Required | Normalization                         | Frontend rule                                | Backend rule | Persian error messages                               |
| ----------- | -------------------------- | --------------- | -------- | ------------------------------------- | -------------------------------------------- | ------------ | ---------------------------------------------------- |
| `homePhone` | parents.home_phone `(new)` | شماره تلفن منزل | always   | digits, fixed `021` prefix + 8 digits | prefix `021-` non-editable, exactly 8 digits | `^021\d{8}$` | شماره تلفن منزل باید شامل پیششماره ۰۲۱ و ۸ رقم باشد. |

## Address (step 2)

| Path                    | DB                              | Label         | Required                 | Normalization    | Frontend rule                                             | Backend rule                           | Persian error messages                         |
| ----------------------- | ------------------------------- | ------------- | ------------------------ | ---------------- | --------------------------------------------------------- | -------------------------------------- | ---------------------------------------------- |
| `address.title`         | family_addresses.title          | عنوان         | always                   | Persian text     | Persian text, 1–50                                        | IsString + Length(1,50)                | عنوان نشانی باید بین ۱ تا ۵۰ نویسه باشد.       |
| `address.province`      | family_addresses.province       | استان         | always                   | Persian text     | 1–100                                                     | IsString + Length(1,100)               | استان باید بین ۱ تا ۱۰۰ نویسه باشد.            |
| `address.city`          | family_addresses.city           | شهر           | always                   | Persian text     | 1–100                                                     | IsString + Length(1,100)               | شهر باید بین ۱ تا ۱۰۰ نویسه باشد.              |
| `address.district`      | family_addresses.district       | منطقه         | removed (Work G)         | —                | removed from new requests; DB column kept for old records | ignored/removed from `AddressInputDto` | حذف شد؛ فقط برای رکوردهای قدیمی خوانده می‌شود. |
| `address.streetAddress` | family_addresses.street_address | نشانی         | always                   | broader char set | 1–500                                                     | IsString + Length(1,500)               | نشانی باید بین ۱ تا ۵۰۰ نویسه باشد.            |
| `address.postalCode`    | family_addresses.postal_code    | کد پستی       | always                   | digits           | exactly 10 digits                                         | `^\d{10}$`                             | کد پستی باید ۱۰ رقم باشد.                      |
| `address.latitude`      | family_addresses.latitude       | عرض جغرافیایی | always (explicit marker) | number           | −90..90, requires `locationSelected`                      | Min(−90) Max(90)                       | موقعیت روی نقشه را انتخاب کنید.                |
| `address.longitude`     | family_addresses.longitude      | طول جغرافیایی | always                   | number           | −180..180                                                 | Min(−180) Max(180)                     | موقعیت روی نقشه را انتخاب کنید.                |

## School and service (step 3)

| Path                      | DB                              | Label      | Required | Normalization    | Frontend rule                  | Backend rule                | Persian error messages                    |
| ------------------------- | ------------------------------- | ---------- | -------- | ---------------- | ------------------------------ | --------------------------- | ----------------------------------------- |
| `school.schoolId`         | students.school_id              | مدرسه      | always   | UUID             | required                       | IsUUID                      | شناسه مدرسه معتبر نیست.                   |
| `school.educationLevel`   | (route metadata)                | مقطع       | always   | —                | 1–100                          | IsString + Length(1,100)    | مقطع تحصیلی باید بین ۱ تا ۱۰۰ نویسه باشد. |
| `school.grade`            | students.grade                  | پایه       | always   | —                | 1–50                           | IsString + Length(1,50)     | پایه تحصیلی باید بین ۱ تا ۵۰ نویسه باشد.  |
| `service.serviceType`     | registrations.service_type      | نوع سرویس  | always   | —                | `BUS \| MINIBUS \| CAR \| VAN` | IsIn                        | نوع وسیله نقلیه انتخابشده معتبر نیست.     |
| `service.paymentPlanType` | registrations.payment_plan_type | روش پرداخت | always   | —                | `FULL \| INSTALLMENTS`         | IsIn                        | روش پرداخت باید یکجا یا اقساطی باشد.      |
| `service.parentNotes`     | registrations.parent_notes      | توضیحات    | optional | broader char set | ≤ 1000                         | IsOptional + Length(1,1000) | توضیحات باید حداکثر ۱۰۰۰ نویسه باشد.      |

## Cross-cutting rules

- Normalize Persian/Arabic digits before every validation; store canonical Latin-digit values.
- National IDs (guardian, father, mother, student, attendant, emergency-contact) are numeric strings of 1–10 digits with no Iranian checksum rule. Never coerce them to numbers; leading zeros must survive validation, persistence, retrieval, editing, exports, and audit redaction.
- Persian-text fields: allowed chars are Persian letters, approved Arabic variants, space, optional half-space `\u200C`, and `،`. Latin letters trigger `لطفاً صفحهکلید را به فارسی تغییر دهید`.
- Validate on blur and on submit. Never block keydown.
- Disable native browser validation (`noValidate`) so English messages never appear.
- Errors render in Persian below the field, set `aria-invalid` and `aria-describedby`, and the first invalid field receives focus.
- `service.parentNotes` and address/notes fields are NOT restricted to Persian letters (they legitimately contain digits/symbols).
- Step 1 (student + guardian) and step 2 (address) and step 3 (school/service) each block advancing until the current step passes.
