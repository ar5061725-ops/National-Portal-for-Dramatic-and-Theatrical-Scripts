import { scoreText } from '@/lib/text';
import styles from './ScoreBadge.module.css';

interface ScoreBadgeProps {
  score: number;
  size?: number;
  tone?: 'solid' | 'glass';
}

export function ScoreBadge({ score, size = 76, tone = 'solid' }: ScoreBadgeProps) {
  return (
    <div className={`${styles.badge} ${tone === 'glass' ? styles.glass : ''}`} style={{ width: size, height: size }}>
      <span dir="ltr" className={styles.value}>
        {scoreText(score)}
      </span>
      <span className={styles.label}>التقييم</span>
    </div>
  );
}
