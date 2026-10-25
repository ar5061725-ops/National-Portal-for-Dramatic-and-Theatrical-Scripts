import { cn } from '@/lib/cn';
import styles from './StarRating.module.css';

const STAR_PATH = 'M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L2.9 9.4l6.3-.9z';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: number;
  tone?: 'light' | 'onDark';
  className?: string;
  /** إخفاء عن قارئات الشاشة عندما تُعرض القيمة نصياً بجانبها */
  decorative?: boolean;
}

export function StarRating({ value, max = 10, size = 22, tone = 'light', className, decorative }: StarRatingProps) {
  return (
    <span
      className={cn(styles.root, className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `التقييم ${value} من ${max}`}
      aria-hidden={decorative || undefined}
    >
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR_PATH} strokeLinejoin="round" className={i < value ? styles.on : tone === 'onDark' ? styles.offDark : styles.off} />
        </svg>
      ))}
    </span>
  );
}
