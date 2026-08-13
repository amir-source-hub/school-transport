ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "opening_time" varchar(5) NOT NULL DEFAULT '08:00';
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "closing_time" varchar(5) NOT NULL DEFAULT '14:00';

UPDATE "offline_payment_destinations"
SET "account_owner" = 'شرکت ثمین گشت مهر ایرانیان',
    "bank_name" = 'بانک سپه',
    "card_number" = '5892107050025868',
    "account_number" = '848301707305',
    "iban" = 'IR250150000000848301707305',
    "instructions" = 'پس از واریز، تصویر رسید و شماره پیگیری بانکی را در پنل ثبت کنید.',
    "updated_at" = NOW()
WHERE "is_active" = true;
