'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}){return <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-danger/20 bg-danger-soft p-6 text-center"><h1 className="font-black text-danger">دریافت اطلاعات پنل ممکن نیست</h1><p className="mt-2 text-sm text-muted">اتصال خود را بررسی کنید و دوباره تلاش نمایید.</p><Button className="mt-4" onClick={reset}>تلاش دوباره</Button></div>}
