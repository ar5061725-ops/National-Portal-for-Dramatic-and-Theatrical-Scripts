import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import styles from './ServiceCard.module.css';

interface ServiceCardProps {
  href: string;
  icon: IconName;
  title: string;
  description: string;
  /** البطاقة الأساسية بأيقونة داكنة */
  primary?: boolean;
}

export function ServiceCard({ href, icon, title, description, primary }: ServiceCardProps) {
  return (
    <Link href={href} className={cn('pressable', styles.card)}>
      <span className={cn(styles.icon, primary && styles.iconPrimary)}>
        <Icon name={icon} size={28} strokeWidth={1.6} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>
      <Icon name="chevronLeft" size={20} strokeWidth={2} />
    </Link>
  );
}
