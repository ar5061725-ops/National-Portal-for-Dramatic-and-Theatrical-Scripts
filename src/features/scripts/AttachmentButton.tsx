'use client';

import { MESSAGES } from '@/config/site';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { useToast } from '@/providers/ToastProvider';
import styles from './AttachmentButton.module.css';

interface AttachmentButtonProps {
  label: string;
  meta: string;
  icon?: IconName;
  /** النسخة الأساسية بخلفية داكنة للأيقونة */
  primary?: boolean;
}

/** مرفق قابل للفتح. الفتح الفعلي يُربط بالخادم لاحقاً؛ حالياً يظهر تنبيه. */
export function AttachmentButton({ label, meta, icon = 'fileLines', primary }: AttachmentButtonProps) {
  const { showToast } = useToast();
  return (
    <button type="button" className={cn('pressable', styles.button)} onClick={() => showToast(MESSAGES.openingFile)}>
      <span className={cn(styles.icon, primary && styles.iconPrimary)}>
        <Icon name={icon} size={20} strokeWidth={1.7} />
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.meta}>{meta}</span>
      </span>
    </button>
  );
}
