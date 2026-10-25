import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

/** صفحات التدفقات (تفاصيل، تسجيل، تقديم، دفع…): إطار بدون شريط تنقل. */
export default function FlowLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
