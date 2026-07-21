import { PublicFooter } from "@/components/navigation/public-footer";
import { PublicHeader } from "@/components/navigation/public-header";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><PublicHeader /><main className="flex-1">{children}</main><PublicFooter /></>;
}
