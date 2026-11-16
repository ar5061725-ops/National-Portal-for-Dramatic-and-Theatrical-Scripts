'use client';

import { useRouter } from 'next/navigation';
import { ROUTES } from '@/config/routes';
import { logout } from '@/lib/api/auth';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Button } from '@/components/ui/Button';

/** ينهي جلسة Supabase ثم يعيد المستخدم لصفحة الدخول. */
export function LogoutButton() {
  const router = useRouter();
  const action = useAsyncAction(logout);

  async function handleClick() {
    await action.run();
    router.replace(ROUTES.splash);
    router.refresh();
  }

  return (
    <Button variant="danger" size="md" block loading={action.isLoading} onClick={() => void handleClick()}>
      تسجيل الخروج
    </Button>
  );
}
