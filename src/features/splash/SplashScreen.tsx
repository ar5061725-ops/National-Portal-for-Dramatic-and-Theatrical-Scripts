import Link from 'next/link';
import { ROUTES } from '@/config/routes';
import { DEMO, SITE } from '@/config/site';
import { getServerSupabase } from '@/lib/supabase/server';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import styles from './SplashScreen.module.css';

const STEPS = [
  { n: '1', title: 'أنشئ حسابك', text: 'سجّل ببيانات بطاقتك المدنية مرة واحدة ليصبح لك ملف مؤلف موثّق.' },
  { n: '2', title: 'قدّم نصك', text: 'أدخل بيانات العمل وارفع ملفاته الأربعة بصيغة PDF.' },
  { n: '3', title: 'تابع التقييم', text: 'تقيّمه لجنة مراجعة بلا كشف هويتك، ويصلك القرار مسبَّباً مع الملاحظات.' },
];

/** صفحة البداية: تعريف مختصر بالبوابة وخطواتها ثم الدخول أو إنشاء الحساب. */
export async function SplashScreen() {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  return (
    <main className={styles.splash}>
      <span className={styles.ringLarge} aria-hidden="true" />
      <span className={styles.ringSmall} aria-hidden="true" />

      <div className={styles.brand}>
        <Logo size={150} priority />
        <div className={styles.titles}>
          <p className={styles.ministry}>
            مقترح إلى معالي وزير الإعلام · {SITE.country}
          </p>
          <h1 className={styles.title}>
            البوابة الوطنية
            <br />
            للنصوص الدرامية والمسرحية
          </h1>
          <span className={styles.rule} aria-hidden="true" />
          <p className={styles.lead}>تصوّر تجريبي لمنصة تقديم النصوص الدرامية والمسرحية وتقييمها وإجازتها.</p>
        </div>
      </div>

      <p className={styles.demo}>
        <b>{DEMO.badge}</b> · {DEMO.full}
      </p>

      <ol className={styles.steps} aria-label="خطوات الاستخدام">
        {STEPS.map((s) => (
          <li key={s.n} className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">
              {s.n}
            </span>
            <span className={styles.stepText}>
              <b>{s.title}</b>
              <span>{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        {signedIn ? (
          <ButtonLink href={ROUTES.home} variant="white" size="lg" block>
            متابعة إلى البوابة
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href={ROUTES.login} variant="white" size="lg" block>
              تسجيل الدخول
            </ButtonLink>
            <ButtonLink href={`${ROUTES.login}?mode=register`} variant="glass" size="lg" block>
              إنشاء حساب جديد
            </ButtonLink>
            <Link href={ROUTES.committeeLogin} className={styles.committee}>
              دخول أعضاء لجنة المراجعة
            </Link>
          </>
        )}
        <p className={styles.version}>الإصدار {SITE.version}</p>
      </div>
    </main>
  );
}
