'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/StatePanel';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** حدّ الأخطاء المشترك لكل المجموعات: يظهر داخل الإطار مع إمكانية إعادة المحاولة. */
export default function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    // نقطة ربط مستقبلية بخدمة مراقبة الأخطاء (Sentry وغيرها).
    console.error(error);
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
