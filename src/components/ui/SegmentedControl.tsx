import { cn } from '@/lib/cn';
import styles from './SegmentedControl.module.css';

interface Option<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** onDark: فوق خلفية زرقاء (الترويسة)، onLight: فوق خلفية فاتحة */
  tone?: 'onDark' | 'onLight';
}

export function SegmentedControl<T extends string>({ options, value, onChange, label, tone = 'onDark' }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn(styles.root, styles[tone])} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={cn('pressable', styles.segment)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
