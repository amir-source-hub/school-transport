import { CirclePlay } from 'lucide-react';

import type { UiRoleIdentifier } from './auth-api';

const tutorials = {
  STUDENT_PORTAL: {
    title: 'ویدیوی راهنمای ثبت‌نام دانش‌آموز',
    description: 'پیش از ثبت‌نام، مراحل وارد کردن اطلاعات دانش‌آموز و سرپرست را مشاهده کنید.',
    fileName: 'Screenrecorder-2026-09-17-17-04-26-472.mp4',
  },
  DRIVER_PORTAL: {
    title: 'ویدیوی راهنمای ثبت‌نام راننده',
    description: 'پیش از ثبت‌نام، مراحل ایجاد حساب و تکمیل اطلاعات راننده را مشاهده کنید.',
    fileName: 'Screenrecorder-2026-09-17-17-14-02-595.mp4',
  },
} as const;

type TutorialRole = keyof typeof tutorials;

const publicAssetUrl = (fileName: string) => {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  const videoPath = `/public/site/release-2026-09-17/videos/${encodeURIComponent(fileName)}`;

  if (!configuredBaseUrl) return videoPath;
  return new URL(videoPath, configuredBaseUrl).toString();
};

export function EnrollmentTutorialVideo({ role }: { role: UiRoleIdentifier }) {
  if (!(role in tutorials)) return null;

  const tutorial = tutorials[role as TutorialRole];

  return (
    <section
      aria-labelledby={`${role}-tutorial-title`}
      className="overflow-hidden rounded-[1.65rem] border border-primary/15 bg-primary/5 shadow-sm"
    >
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
          <CirclePlay className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id={`${role}-tutorial-title`} className="text-sm font-black text-foreground">
            {tutorial.title}
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted">{tutorial.description}</p>
        </div>
      </div>
      <div className="border-t border-primary/10 bg-navy p-2 sm:p-3">
        <video
          key={tutorial.fileName}
          controls
          playsInline
          preload="metadata"
          aria-label={tutorial.title}
          className="mx-auto max-h-[32rem] w-full rounded-xl bg-black object-contain"
        >
          <source src={publicAssetUrl(tutorial.fileName)} type="video/mp4" />
          مرورگر شما امکان پخش این ویدیو را ندارد.
        </video>
      </div>
    </section>
  );
}
