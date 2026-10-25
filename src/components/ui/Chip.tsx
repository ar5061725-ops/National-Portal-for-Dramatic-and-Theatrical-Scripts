import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './Chip.module.css';

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  pressed: boolean;
}

/** زر تبديل على شكل حبة (تصنيفات متعددة الاختيار). */
export function Chip({ pressed, className, type = 'button', ...rest }: ChipProps) {
  return <button type={type} aria-pressed={pressed} className={cn('pressable', styles.chip, className)} {...rest} />;
}
