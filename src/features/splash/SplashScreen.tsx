import { ROUTES } from '@/config/routes';
import { SITE } from '@/config/site';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import styles from './SplashScreen.module.css';

export function SplashScreen() {
  return (
    <main className={styles.splash}>
      <span className={styles.ringLarge} aria-hidden="true" />
      <span className={styles.ringSmall} aria-hidden="true" />

      <div className={styles.brand}>
        <Logo size={190} priority />
        <div className={styles.titles}>
          <p className={styles.ministry}>
            {SITE.ministry} · {SITE.country}
          </p>
          <h1 className={styles.title}>
            البوابة الوطنية
            <br />
            للنصوص الدرامية والمسرحية
          </h1>
          <span className={styles.rule} aria-hidden="true" />
        </div>
      </div>

      <div className={styles.actions}>
        <ButtonLink href={ROUTES.home} variant="white" size="lg" block>
          الدخول إلى البوابة
        </ButtonLink>
        <p className={styles.version}>الإصدار {SITE.version}</p>
      </div>
    </main>
  );
}
