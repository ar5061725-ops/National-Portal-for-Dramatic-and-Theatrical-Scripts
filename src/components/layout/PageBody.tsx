import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './PageBody.module.css';

interface PageBodyProps {
  children: ReactNode;
  className?: string;
  /** عمودان للقوائم على الشاشات الواسعة */
  grid?: boolean;
  /** المسافة بين العناصر بالبكسل */
  gap?: number;
  as?: 'main' | 'div';
}

export function PageBody({ children, className, grid, gap, as: Tag = 'main' }: PageBodyProps) {
  const style = gap === undefined ? undefined : ({ '--body-gap': `${gap}px` } as CSSProperties);
  return (
    <Tag className={cn(styles.body, grid && styles.grid, className)} style={style}>
      {children}
    </Tag>
  );
}
