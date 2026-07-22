import { cn } from '@/lib/cn';

export function RouteField({
  density = 'medium',
  contrast = 'subtle',
  className,
}: {
  density?: 'low' | 'medium' | 'high';
  contrast?: 'subtle' | 'visible';
  className?: string;
}) {
  const dotCount = density === 'low' ? 3 : density === 'high' ? 8 : 5;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        contrast === 'subtle' ? 'opacity-20' : 'opacity-40',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="route-grid"
            x="0"
            y="0"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="40" cy="40" r="1.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#route-grid)" />
        <path
          d="M0 60 Q25 20 50 50 T100 40"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
        {Array.from({ length: dotCount }).map((_, i) => (
          <circle
            key={i}
            cx={15 + i * 25}
            cy={35 + (i % 2 === 0 ? 15 : -10)}
            r="3"
            fill="currentColor"
            opacity="0.6"
          />
        ))}
      </svg>
    </div>
  );
}
