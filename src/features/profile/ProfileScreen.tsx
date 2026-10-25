import { ROUTES } from '@/config/routes';
import type { ProfileData } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { IconName } from '@/components/ui/Icon';
import styles from './ProfileScreen.module.css';
import { MenuLink } from './MenuLink';
import { EditProfileButton } from './EditProfileButton';

const MENU: { label: string; href: string; icon: IconName }[] = [
  { label: 'الإشعارات', href: ROUTES.notifications, icon: 'bell' },
  { label: 'الإيصالات والمدفوعات', href: ROUTES.receipts, icon: 'receipt' },
  { label: 'الشروط والإرشادات', href: ROUTES.terms, icon: 'info' },
];

export function ProfileScreen({ profile }: { profile: ProfileData }) {
  const { user, stats } = profile;
  const figures = [
    { value: stats.submitted, label: 'مقدّمة', color: 'var(--primary)' },
    { value: stats.approved, label: 'مجازة', color: 'var(--success)' },
    { value: stats.needsRevision, label: 'تحتاج تعديل', color: 'var(--warning)' },
  ];

  return (
    <>
      <PageHeader bottomPadding={70}>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {user.name.charAt(0)}
          </span>
          <h1 className={styles.name}>{user.name}</h1>
          <p className={styles.role}>{user.role}</p>
        </div>
      </PageHeader>

      <PageBody className={styles.body}>
        <dl className={styles.stats}>
          {figures.map((f) => (
            <div key={f.label} className={styles.stat}>
              <dt className={styles.statLabel}>{f.label}</dt>
              <dd className={styles.statValue} style={{ color: f.color }}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        <Card padding={16} radius={20} gap={0}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>رقم الهاتف</span>
            <span dir="ltr" className={styles.infoValue}>
              {user.phone}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>البريد</span>
            <span dir="ltr" className={styles.infoValue}>
              {user.email}
            </span>
          </div>
        </Card>

        <Card padding={8} radius={20} gap={0}>
          <EditProfileButton />
          {MENU.map((item) => (
            <MenuLink key={item.href} {...item} />
          ))}
        </Card>

        <ButtonLink href={ROUTES.splash} variant="danger" size="md" block>
          تسجيل الخروج
        </ButtonLink>
      </PageBody>
    </>
  );
}
