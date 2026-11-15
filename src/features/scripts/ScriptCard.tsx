import Link from 'next/link';
import { ROUTES } from '@/config/routes';
import { scoreText } from '@/lib/text';
import type { Script } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { StarRating } from '@/components/ui/StarRating';
import styles from './ScriptCard.module.css';

/** بطاقة مجازة بنص مختصر. بيانات تواصل الكاتب لا تظهر هنا، وتُطلب من صفحة التفاصيل. */
export function ScriptCard({ script }: { script: Script }) {
  const [length] = script.stats;
  const detailHref = ROUTES.approvedDetail(script.id);

  return (
    <Card as="article" padding={20} elevated>
      <Link href={detailHref} aria-label={`عرض تفاصيل ${script.title}`} className={styles.summary}>
        <div className={styles.top}>
          <div className={styles.topText}>
            <h2 className={styles.title}>{script.title}</h2>
            <div className={styles.badges}>
              <Badge size="sm">{script.kind}</Badge>
              <Badge size="sm" tone="success">
                مجاز
              </Badge>
            </div>
            <div className={styles.facts}>
              <span className={styles.fact}>
                <Icon name="tag" size={15} />
                النوع: <b>{script.genre}</b>
              </span>
              <span className={styles.fact}>
                <Icon name="video" size={15} />
                {length.label}: <b>{length.value}</b>
              </span>
            </div>
          </div>
          <ScoreBadge score={script.score} />
        </div>

        <div className={styles.rating}>
          <StarRating value={script.score} decorative />
          <span dir="ltr" className={styles.ratingText}>
            {scoreText(script.score)}
          </span>
        </div>

        <div className={styles.logline}>
          <span className={styles.loglineLabel}>اللوجلاين</span>
          <p>{script.logline}</p>
        </div>
      </Link>

      <div className={styles.author}>
        <Icon name="user" size={18} />
        <span className={styles.authorLabel}>المؤلف:</span>
        <span className={styles.authorName}>{script.author.name}</span>
      </div>

      <ButtonLink href={detailHref} size="md" block>
        عرض التفاصيل وطلب التواصل
        <Icon name="chevronLeft" size={16} strokeWidth={2.2} />
      </ButtonLink>
    </Card>
  );
}
