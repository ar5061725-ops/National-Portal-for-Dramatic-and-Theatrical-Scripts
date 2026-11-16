import { ROUTES } from '@/config/routes';
import { MEMO, MEMO_PARTS, READING_PATHS } from '@/content/memo';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Accordion } from '@/components/ui/Accordion';
import type { AccordionItem } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import styles from './MemoScreen.module.css';

const PART_ITEMS: AccordionItem[] = MEMO_PARTS.map((part) => ({
  id: part.id,
  title: part.title,
  content: (
    <ul className={styles.chapters}>
      {part.chapters.map((chapter) => (
        <li key={chapter}>{chapter}</li>
      ))}
    </ul>
  ),
}));

export function MemoScreen() {
  return (
    <>
      <PageHeader
        rounded
        start={<BackButton href={ROUTES.home} />}
        end={<Logo size={44} />}
        title="المذكرة التعليمية"
        titleSize={24}
        subtitle="للقراءة فقط داخل البوابة: بلا تحميل أو طباعة"
      />

      <PageBody gap={16}>
        <Card padding={20} elevated>
          <p className={styles.kicker}>هندسة المسلسل: من النص إلى الصورة</p>
          <h2 className={styles.title}>{MEMO.title}</h2>
          <p className={styles.description}>{MEMO.description}</p>
          <dl className={styles.meta}>
            <div>
              <dt>المؤلف</dt>
              <dd>{MEMO.author}</dd>
            </div>
            <div>
              <dt>الإصدار</dt>
              <dd>{MEMO.version}</dd>
            </div>
            <div>
              <dt>الفصول</dt>
              <dd>{MEMO.chapters} فصلاً + ملحق</dd>
            </div>
            <div>
              <dt>الصفحات</dt>
              <dd>
                {MEMO.pages} · {MEMO.sizeLabel}
              </dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <ButtonLink href={ROUTES.memoRead} size="md">
              <Icon name="fileLines" size={18} />
              اقرأ المذكرة (للقراءة فقط)
            </ButtonLink>
          </div>
        </Card>

        <section aria-labelledby="paths-heading" className={styles.section}>
          <h2 id="paths-heading" className={styles.sectionTitle}>
            من أين تبدأ؟ خرائط القراءة الثلاث
          </h2>
          <div className={styles.paths}>
            {READING_PATHS.map((path) => (
              <Card key={path.id} as="article" padding={16} radius={18} gap={6}>
                <h3 className={styles.pathTitle}>{path.title}</h3>
                <span className={styles.pathAudience}>{path.audience}</span>
                <p className={styles.pathSteps}>{path.steps}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="index-heading" className={styles.section}>
          <h2 id="index-heading" className={styles.sectionTitle}>
            الفهرس: المذكرة في خمسة أبواب
          </h2>
          <Accordion items={PART_ITEMS} defaultOpenId={MEMO_PARTS[0]?.id} />
        </section>

        <p className={styles.notice} role="note">
          {MEMO.notice}
        </p>
      </PageBody>
    </>
  );
}
