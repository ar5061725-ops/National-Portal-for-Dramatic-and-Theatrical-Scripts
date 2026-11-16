import { ROUTES } from '@/config/routes';
import { TERMS_SECTIONS } from '@/content/terms';
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

        <ButtonLink href={ROUTES.newSubmission} size="lg" block>
          فهمت، أريد تقديم نص
        </ButtonLink>
      </PageBody>
    </>
  );
}
