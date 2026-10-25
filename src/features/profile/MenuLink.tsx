import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import styles from './MenuLink.module.css';

interface MenuLinkProps {
  label: string;
  href: string;
  icon: IconName;
}

export function MenuLink({ label, href, icon }: MenuLinkProps) {
  return (
    <Link href={href} className={`pressable ${styles.item}`}>
      <span className={styles.icon}>
        <Icon name={icon} size={18} />
      </span>
      <span className={styles.label}>{label}</span>
      <Icon name="chevronLeft" size={16} strokeWidth={2} />
    </Link>
  );
}
