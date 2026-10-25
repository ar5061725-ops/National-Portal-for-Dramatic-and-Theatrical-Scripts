import { WORK_TYPES } from '@/config/submission';
import { cn } from '@/lib/cn';
import type { WorkType } from '@/types';
import { Icon } from '@/components/ui/Icon';
import styles from './WorkTypePicker.module.css';

interface WorkTypePickerProps {
  value: WorkType;
  onChange: (type: WorkType) => void;
}

export function WorkTypePicker({ value, onChange }: WorkTypePickerProps) {
  return (
    <div role="group" aria-label="نوع العمل" className={styles.grid}>
      {WORK_TYPES.map((type) => (
        <button
          key={type.id}
          type="button"
          aria-pressed={type.id === value}
          onClick={() => onChange(type.id)}
          className={cn('pressable', styles.tile)}
        >
          <Icon name={type.icon} size={30} strokeWidth={1.6} />
          {type.label}
        </button>
      ))}
    </div>
  );
}
