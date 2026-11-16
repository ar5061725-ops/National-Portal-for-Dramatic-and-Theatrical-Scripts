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
        {/* الإجراء الرئيس: تقديم نص جديد. الثاني: النصوص المجازة. */}
        <ServiceCard
          primary
          href={ROUTES.newSubmission}
          icon="edit"
          tag="مسار الكاتب المبتدئ"
          title="تقديم نص جديد"
          description="أرسل نصك الدرامي أو المسرحي للمراجعة والإجازة"
        />
        <ServiceCard
          href={ROUTES.approved}
          icon="fileCheck"
          tag="مسار الكاتب المحترف"
          title="النصوص المجازة"
          description="تصفّح النصوص المعتمدة وبياناتها المختصرة وتقييمها، واطلب التواصل مع الكاتب"
        />
      </PageBody>
    </>
  );
}
