import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
  padding?: number;
  radius?: number;
  gap?: number;
  elevated?: boolean;
  dashed?: boolean;
}

/** حاوية بيضاء بحدود وزوايا مدورة. تنسيقها من متغيرات CSS لا من style مضمّن ثابت. */
export function Card({ as: Tag = 'div', padding = 18, radius = 22, gap = 14, elevated, dashed, className, style, ...rest }: CardProps) {
  const vars = { '--card-padding': `${padding}px`, '--card-radius': `${radius}px`, '--card-gap': `${gap}px`, ...style } as CSSProperties;
  return <Tag className={cn(styles.card, elevated && styles.elevated, dashed && styles.dashed, className)} style={vars} {...rest} />;
}
