import type { ReactNode } from 'react';
import type { Tone } from '@/types';
import { cn } from '@/lib/cn';
import styles from './Badge.module.css';

interface BadgeProps {
  tone?: Tone | 'onDark' | 'white';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'info', size = 'md', children, className }: BadgeProps) {
  return <span className={cn(styles.badge, styles[tone], styles[size], className)}>{children}</span>;
}
