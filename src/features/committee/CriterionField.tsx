import { scoreBandLabel } from '@/lib/review';
import type { CriterionScoreInput } from '@/types';
import { TextArea, TextField } from '@/components/ui/TextField';
import styles from './CommitteeReview.module.css';

const SCORE_OPTIONS = Array.from({ length: 11 }, (_, i) => i);

interface CriterionFieldProps {
  label: string;
  hint: string;
  weight: number;
  value: CriterionScoreInput;
  /** يُظهر خطأ المبرر المطلوب بعد محاولة الإرسال */
  showError: boolean;
  onChange: (patch: Partial<CriterionScoreInput>) => void;
}

/** معيار تقييم واحد: درجة 0–10 + مبرر إلزامي + موضع الشاهد. */
export function CriterionField({ label, hint, weight, value, showError, onChange }: CriterionFieldProps) {
  const invalid = showError && value.rationale.trim().length < 3;
  return (
    <fieldset className={styles.criteria}>
      <legend className={styles.fieldLabel}>
        {label} <span className={styles.statLabelDark}>· الوزن {weight}%</span>
      </legend>
      <p className={styles.statLabelDark}>{hint}</p>
      <label className={styles.criterion}>
        <span>
          الدرجة: <b>{scoreBandLabel(value.score)}</b>
        </span>
        <select aria-label={`درجة ${label}`} value={value.score} onChange={(e) => onChange({ score: Number(e.target.value) })} className={styles.select}>
          {SCORE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <TextArea label="المبرر (مطلوب)" value={value.rationale} error={invalid ? 'اكتب مبرراً لهذه الدرجة' : undefined} onChange={(e) => onChange({ rationale: e.target.value })} />
      <TextField label="موضع الشاهد (صفحة أو مشهد)" placeholder="مثال: ص 12" value={value.locator} onChange={(e) => onChange({ locator: e.target.value })} />
    </fieldset>
  );
}
