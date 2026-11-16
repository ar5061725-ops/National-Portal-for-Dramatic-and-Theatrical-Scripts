import type { ReactNode } from 'react';
import styles from './FormError.module.css';

/** رسالة خطأ النموذج: تُعلن لقارئ الشاشة (role=alert) ولا تُرسم إن لم يوجد محتوى. */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className={styles.error}>
      {children}
    </p>
  );
}
