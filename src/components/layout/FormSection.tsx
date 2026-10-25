import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import styles from './FormSection.module.css';

interface FormSectionProps {
  number: number;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}

/** قسم مرقّم داخل نموذج متعدد الخطوات. */
export function FormSection({ number, title, aside, children }: FormSectionProps) {
  return (
    <Card as="section" padding={20}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <span className={styles.number} aria-hidden="true">
            {number}
          </span>
          <h2 className={styles.title}>{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}
