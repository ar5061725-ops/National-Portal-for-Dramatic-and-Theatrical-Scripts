'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import styles from './BottomNav.module.css';

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: ROUTES.home, label: 'الرئيسية', icon: 'home' },
  { href: ROUTES.approved, label: 'النصوص', icon: 'fileCheck' },
  { href: ROUTES.submissions, label: 'طلباتي', icon: 'list' },
  { href: ROUTES.account, label: 'حسابي', icon: 'user' },
];

/** صفحات لا يظهر فيها الشريط (شاشات الدخول والبداية وإعادة التعيين ولوحة اللجنة). */
const HIDDEN_EXACT = new Set(['/', '/login', '/committee/login', '/reset-password']);

export function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN_EXACT.has(pathname) || pathname === '/committee' || pathname.startsWith('/committee/')) return null;
  return (
    <nav aria-label="التنقل الرئيسي" className={styles.nav}>
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('pressable', styles.link, active && styles.active)}>
            <span className={styles.pill}>
              <Icon name={item.icon} size={22} strokeWidth={active ? 2 : 1.7} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
