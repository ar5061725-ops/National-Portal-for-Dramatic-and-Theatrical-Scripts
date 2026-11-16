import { ROUTES } from '@/config/routes';
import { MEMO } from '@/content/memo';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import styles from './MemoPromoCard.module.css';

/** بطاقة تعليمية مستقلة للمذكرة «هندسة المسلسل» في الرئيسية. */
export function MemoPromoCard() {
  return (
    <section className={styles.card} aria-labelledby="memo-promo-title">
      <div className={styles.head}>
        <span className={styles.icon}>
          <Icon name="fileLines" size={26} strokeWidth={1.6} />
        </span>
        <div className={styles.text}>
          <span className={styles.tag}>المذكرة التعليمية · مسار الناقد</span>
          <h2 id="memo-promo-title" className={styles.title}>
            هندسة المسلسل
          </h2>
          <p className={styles.subtitle}>{MEMO.tagline}</p>
        </div>
      </div>
      <p className={styles.description}>
        مذكرة من {MEMO.chapters} فصلاً تشمل البناء الدرامي والإيقاع والهوية البصرية والصوتية وتكوين المشاهد وأدوات النقد. مفتوحة للزائر دون حساب.
      </p>
      <div className={styles.actions}>
        <ButtonLink href={ROUTES.memo} size="md" variant="white">
          اقرأ المذكرة
        </ButtonLink>
      </div>
    </section>
  );
}
