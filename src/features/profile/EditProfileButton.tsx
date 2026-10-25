'use client';

import { MESSAGES } from '@/config/site';
import { useToast } from '@/providers/ToastProvider';
import { Icon } from '@/components/ui/Icon';
import styles from './MenuLink.module.css';

/** تعديل البيانات: نموذج التعديل غير متوفر بعد، يظهر تنبيه مؤقتاً. */
export function EditProfileButton() {
  const { showToast } = useToast();
  return (
    <button type="button" className={`pressable ${styles.item} ${styles.button}`} onClick={() => showToast(MESSAGES.editProfileOpened)}>
      <span className={styles.icon}>
        <Icon name="edit" size={18} />
      </span>
      <span className={styles.label}>تعديل البيانات</span>
      <Icon name="chevronLeft" size={16} strokeWidth={2} />
    </button>
  );
}
