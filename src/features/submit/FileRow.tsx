'use client';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { PdfFileInput } from '@/components/ui/PdfFileInput';
import styles from './FileRow.module.css';

interface FileRowProps {
  label: string;
  fileName?: string;
  /** يبرز الصف بالأحمر عندما يكون مطلوباً ولم يُرفع */
  highlightMissing?: boolean;
  error?: string;
  onFile: (file: File) => void;
  onError: (message: string) => void;
}

export function FileRow({ label, fileName, highlightMissing, error, onFile, onError }: FileRowProps) {
  const done = Boolean(fileName);
  return (
    <div>
      <div className={cn(styles.row, done && styles.done, !done && highlightMissing && styles.missing)}>
        <span className={styles.icon}>
          <Icon name={done ? 'check' : 'file'} size={22} strokeWidth={done ? 2.4 : 1.7} />
        </span>
        <div className={styles.text}>
          <span className={styles.label}>{label}</span>
          <span className={styles.status}>{fileName ?? 'لم يُرفع بعد'}</span>
        </div>
        <label className={cn('pressable', styles.action)}>
          <Icon name="upload" size={16} strokeWidth={2} />
          {done ? 'تغيير' : 'رفع'}
          <PdfFileInput ariaLabel={`رفع ${label}`} onFile={onFile} onError={onError} />
        </label>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
