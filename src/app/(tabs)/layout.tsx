import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';

/** صفحات التبويبات الرئيسية: إطار + شريط تنقل سفلي. */
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {children}
      <BottomNav />
    </AppShell>
  );
}
