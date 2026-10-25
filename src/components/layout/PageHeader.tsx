import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import styles from './PageHeader.module.css';

export function BackButton({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="رجوع" className={cn('pressable', styles.back)}>
      <Icon name="chevronRight" size={20} strokeWidth={2} />
    </Link>
  );
}

interface PageHeaderProps {
  /** الجهة اليمنى من الشريط العلوي (غالباً زر الرجوع) */
  start?: ReactNode;
  /** عنوان وسط الشريط العلوي */
  barTitle?: string;
  /** الجهة اليسرى من الشريط العلوي (شعار أو شارة) */
  end?: ReactNode;
  title?: ReactNode;
  titleSize?: number;
  titleFont?: 'display' | 'body';
  subtitle?: ReactNode;
  rounded?: boolean;
  /** يزيد المساحة أسفل الترويسة (لعناصر تتداخل معها) */
  bottomPadding?: number;
  tone?: 'primary' | 'dark';
  /** محتوى إضافي تحت العنوان (بحث، تبويبات، إحصاءات…) */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  start,
  barTitle,
  end,
  title,
  titleSize = 26,
  titleFont = 'display',
  subtitle,
  rounded,
  bottomPadding,
  tone = 'primary',
  children,
  className,
}: PageHeaderProps) {
  const hasBar = start || barTitle || end;
  const style = bottomPadding === undefined ? undefined : ({ '--header-pb': `${bottomPadding}px` } as CSSProperties);
  return (
    <header className={cn(styles.header, rounded && styles.rounded, tone === 'dark' && styles.dark, className)} style={style}>
      {hasBar && (
        <div className={styles.bar}>
          {start ?? <span />}
          {barTitle && <div className={styles.barTitle}>{barTitle}</div>}
          {end ?? <span />}
        </div>
      )}
      {(title || subtitle) && (
        <div className={styles.titles}>
          {title && (
            <h1
              className={cn(styles.title, titleFont === 'display' && styles.display)}
              style={{ '--title-size': `${titleSize}px` } as CSSProperties}
            >
              {title}
            </h1>
          )}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
      {children}
    </header>
  );
}
