import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Spinner } from './Spinner';
import styles from './StatePanel.module.css';

type PanelTone = 'info' | 'success' | 'danger' | 'loading';

interface StatePanelProps {
  tone?: PanelTone;
  icon?: IconName;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** يملأ المساحة المتاحة ويتوسطها (شاشات النتيجة الكاملة) */
  fill?: boolean;
  /** إطار منقط داخل بطاقة (حالة فراغ داخل قائمة) */
  boxed?: boolean;
  as?: 'h1' | 'h2' | 'div';
}

/** لبنة موحّدة لكل الحالات: فراغ، نجاح، خطأ، تحميل. */
export function StatePanel({ tone = 'info', icon, title, description, children, fill, boxed, as: Heading = 'h2' }: StatePanelProps) {
  const isLoading = tone === 'loading';
  return (
    <div
      className={cn(styles.panel, fill && styles.fill, boxed && styles.boxed)}
      role={isLoading ? 'status' : tone === 'danger' ? 'alert' : undefined}
      aria-live={isLoading ? 'polite' : undefined}
    >
      <div className={cn(styles.icon, styles[tone])}>{isLoading ? <Spinner size={72} /> : icon && <Icon name={icon} size={tone === 'success' ? 48 : 40} strokeWidth={tone === 'success' ? 2.4 : 2} />}</div>
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'تعذّر تحميل البيانات', description = 'تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.', onRetry }: ErrorStateProps) {
  return (
    <StatePanel tone="danger" icon="alert" title={title} description={description} fill>
      {onRetry && (
        <Button size="md" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </StatePanel>
  );
}
