import Link from 'next/link';
import { ROUTES } from '@/config/routes';
import { TERMS_SECTIONS } from '@/content/terms';
import { MEMO } from '@/content/memo';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Accordion } from '@/components/ui/Accordion';
import type { AccordionItem } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import styles from './TermsScreen.module.css';

const ITEMS: AccordionItem[] = TERMS_SECTIONS.map((section) => ({
  id: section.id,
  title: section.title,
  content: (
    <ul className={styles.points}>
      {section.points.map((point) => (
        <li key={point} className={styles.point}>
          <Icon name="check" size={18} strokeWidth={2.4} />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  ),
}));

export function TermsScreen() {
  return (
    <>
      <PageHeader
        start={<BackButton href={ROUTES.account} />}
        end={<Logo size={44} />}
        title="الشروط والإرشادات"
        titleSize={24}
        subtitle="الملفات المطلوبة وأمثلة اللوجلاين وخطوات التقديم"
      />
      <PageBody>
        <Accordion items={ITEMS} defaultOpenId={TERMS_SECTIONS[0]?.id} />

        {/* رابط ثابت إلى المذكرة التعليمية داخل الإرشادات */}
        <Link href={ROUTES.memo} className={styles.memoLink}>
          <span className={styles.memoIcon}>
            <Icon name="fileLines" size={22} />
          </span>
          <span className={styles.memoText}>
            <span className={styles.memoTitle}>المذكرة التعليمية: هندسة المسلسل</span>
            <span className={styles.memoHint}>تطوّر نصك قبل تقديمه · {MEMO.chapters} فصلاً</span>
          </span>
          <Icon name="chevronLeft" size={18} strokeWidth={2} />
        </Link>

        <ButtonLink href={ROUTES.newSubmission} size="lg" block>
          فهمت، أريد تقديم نص
        </ButtonLink>
      </PageBody>
    </>
  );
}
