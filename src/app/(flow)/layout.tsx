import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { getServerSupabase } from '@/lib/supabase/server';

/** صفحات التدفقات (تفاصيل، تقديم، دفع…): إطار، ويظهر شريط التنقل السفلي دائماً بعد تسجيل الدخول. */
export default async function FlowLayout({ children }: { children: ReactNode }) {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  return (
    <AppShell>
      {children}
      {data.user ? <BottomNav /> : null}
    </AppShell>
  );
}
