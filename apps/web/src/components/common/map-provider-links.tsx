import { MapPinned } from 'lucide-react';

export function MapProviderLinks({ latitude, longitude }: { latitude: number; longitude: number }) {
  const links = [
    { label: 'نشان', href: `https://neshan.org/maps/@${latitude},${longitude},16z,0p` },
    { label: 'بلد', href: `https://balad.ir/location?latitude=${latitude}&longitude=${longitude}&zoom=16` },
    { label: 'گوگل‌مپ', href: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` },
  ];
  return <div className="mt-4" aria-label="انتخاب مسیریاب"><p className="mb-2 flex items-center gap-2 text-sm font-black"><MapPinned className="size-5 text-primary" />باز کردن موقعیت در مسیریاب</p><div className="grid grid-cols-3 gap-2">{links.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft px-3 text-sm font-black text-primary transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{link.label}</a>)}</div></div>;
}
