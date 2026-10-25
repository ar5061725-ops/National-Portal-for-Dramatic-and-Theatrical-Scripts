import { Fragment } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import styles from './Stepper.module.css';

interface StepperProps {
  steps: string[];
  /** فهرس الخطوة الحالية (يبدأ من 0)؛ ما قبلها مكتمل */
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className={styles.root} aria-label="مراحل التقديم">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        return (
          <Fragment key={label}>
            {i > 0 && <li aria-hidden="true" className={cn(styles.line, i <= current && styles.lineActive)} />}
            <li className={cn(styles.step, styles[state])} aria-current={state === 'current' ? 'step' : undefined}>
              <span className={styles.dot}>{state === 'done' ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
              {label}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
