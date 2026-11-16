import { useId } from 'react';
import { DECISIONS } from '@/config/requests';
import { cn } from '@/lib/cn';
import type { DecisionId } from '@/types';
import styles from './CommitteeReview.module.css';

interface DecisionPickerProps {
  /** عنوان المجموعة (يُقرأ لقارئ الشاشة) */
  label: string;
  value: DecisionId;
  onChange: (value: DecisionId) => void;
}

/** اختيار قرار/توصية من ثلاثة (إجازة · تعديل · رفض)؛ يُستخدم في تقييم المراجع وقرار المشرف. */
export function DecisionPicker({ label, value, onChange }: DecisionPickerProps) {
  const labelId = useId();
  return (
    <>
      <div className={styles.fieldLabel} id={labelId}>
        {label}
      </div>
      <div className={styles.decisions} role="group" aria-labelledby={labelId}>
        {DECISIONS.map((d) => (
          <button key={d.id} type="button" aria-pressed={d.id === value} data-tone={d.tone} onClick={() => onChange(d.id)} className={cn('pressable', styles.decision)}>
            {d.label}
          </button>
        ))}
      </div>
    </>
  );
}
