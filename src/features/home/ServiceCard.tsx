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
  /** وسم صغير فوق العنوان، مثل «مسار الكاتب المبتدئ» */
  tag?: string;
  /** الإجراء الرئيس بأيقونة داكنة */
  primary?: boolean;
}

export function ServiceCard({ href, icon, title, description, tag, primary }: ServiceCardProps) {
  return (
    <Link href={href} className={cn('pressable', styles.card)}>
      <span className={cn(styles.icon, primary && styles.iconPrimary)}>
        <Icon name={icon} size={28} strokeWidth={1.6} />
      </span>
      <span className={styles.text}>
        {tag && <span className={styles.tag}>{tag}</span>}
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>
      <Icon name="chevronLeft" size={20} strokeWidth={2} />
    </Link>
  );
}
