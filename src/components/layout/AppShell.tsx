import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

/** إطار التطبيق: بعرض الشاشة على الهاتف، وعمود مركزي على الشاشات الأكبر. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>{children}</div>
    </div>
  );
}
