import { useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './TextField.module.css';

interface FieldMeta {
  label: string;
  error?: string;
  hint?: string;
  /** للأرقام والبريد: اتجاه لاتيني مع محاذاة لليمين */
  ltr?: boolean;
}

type InputFieldProps = FieldMeta & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;
type TextAreaProps = FieldMeta & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

function FieldShell({ id, label, error, hint, children }: FieldMeta & { id: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {children}
      {error && (
        <span id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return ids || undefined;
}

export function TextField({ label, error, hint, ltr, id, ...rest }: InputFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <input
        id={fieldId}
        className={cn(styles.control, ltr && styles.ltr)}
        dir={ltr ? 'ltr' : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextArea({ label, error, hint, ltr, id, ...rest }: TextAreaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <textarea
        id={fieldId}
        className={cn(styles.control, styles.textarea, ltr && styles.ltr)}
        dir={ltr ? 'ltr' : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...rest}
      />
    </FieldShell>
  );
}
