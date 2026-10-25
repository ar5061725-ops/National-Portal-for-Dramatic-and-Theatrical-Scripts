'use client';

import { BackButton } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import styles from './PrintToolbar.module.css';

/** شريط أدوات يختفي عند الطباعة. */
export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className={styles.toolbar}>
      <BackButton href={backHref} />
      <p className={styles.hint}>اختر «حفظ بصيغة PDF» من نافذة الطباعة لتنزيل الشهادة</p>
      <Button variant="gold" size="md" onClick={() => window.print()}>
        <Icon name="print" size={18} strokeWidth={2} />
        طباعة
      </Button>
    </div>
  );
}
