import Link from 'next/link';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';
import type { AppNotification } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { StatePanel } from '@/components/ui/StatePanel';
import styles from './NotificationsScreen.module.css';

export function NotificationsScreen({ notifications }: { notifications: AppNotification[] }) {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <PageHeader
        start={<BackButton href={ROUTES.profile} />}
        end={unreadCount > 0 ? <Badge tone="white">{unreadCount} جديد</Badge> : undefined}
        title="الإشعارات"
      />
      <PageBody grid gap={10}>
        {notifications.map((n) => (
          <Link key={n.id} href={n.href} className={cn('pressable', styles.item, n.unread && styles.unread)}>
            <span className={cn(styles.icon, styles[n.tone])}>
              <Icon name={n.icon} size={22} strokeWidth={2} />
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{n.title}</span>
              <span className={styles.body}>{n.body}</span>
              <span className={styles.time}>{n.time}</span>
            </span>
            {n.unread && <span className={styles.dot} role="img" aria-label="غير مقروء" />}
          </Link>
        ))}
        {notifications.length === 0 && (
          <div data-span="full">
            <StatePanel boxed icon="bell" title="لا توجد إشعارات" description="ستظهر هنا أي تحديثات على طلباتك." />
          </div>
        )}
      </PageBody>
    </>
  );
}
