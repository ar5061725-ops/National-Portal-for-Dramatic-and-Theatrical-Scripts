import type { ReactNode } from 'react';

/** صفحات الطباعة: بدون إطار التطبيق. */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
