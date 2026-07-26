ALTER TABLE "schools" ADD COLUMN "education_options" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "schools"
SET "education_options" = '[
  {"level":"ابتدایی","grades":["اول","دوم","سوم","چهارم","پنجم","ششم"]},
  {"level":"متوسطه اول","grades":["هفتم","هشتم","نهم"]},
  {"level":"متوسطه دوم","grades":["دهم","یازدهم","دوازدهم"]}
]'::jsonb
WHERE "education_options" = '[]'::jsonb;
