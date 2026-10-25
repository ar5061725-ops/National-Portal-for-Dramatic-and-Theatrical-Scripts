import { ROUTES } from '@/config/routes';
import { SITE } from '@/config/site';
import { PageBody } from '@/components/layout/PageBody';
import { PageHeader } from '@/components/layout/PageHeader';
import { Logo } from '@/components/ui/Logo';
import { ServiceCard } from './ServiceCard';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  return (
    <>
      <PageHeader
        rounded
        titleFont="body"
        title="أهلاً بك"
        subtitle="اختر الخدمة التي تريدها"
        start={
          <div className={styles.brand}>
            <Logo size={52} />
            <div className={styles.brandText}>
              <span className={styles.ministry}>
                {SITE.ministry} · {SITE.country}
              </span>
              <span className={styles.name}>{SITE.shortName}</span>
            </div>
          </div>
        }
      />
      <PageBody gap={18}>
        <ServiceCard primary href={ROUTES.scripts} icon="fileCheck" title="النصوص المجازة" description="تصفّح النصوص المعتمدة وبيانات مؤلفيها وتقييمها" />
        <ServiceCard href={ROUTES.login} icon="edit" title="تقديم نص جديد" description="أرسل نصك الدرامي أو المسرحي للمراجعة والإجازة" />
      </PageBody>
    </>
  );
}
