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
  { href: ROUTES.scripts, label: 'النصوص', icon: 'fileCheck' },
  { href: ROUTES.requests, label: 'طلباتي', icon: 'list' },
  { href: ROUTES.profile, label: 'حسابي', icon: 'user' },
];

export function BottomNav() {
  const pathname = usePathname();
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
