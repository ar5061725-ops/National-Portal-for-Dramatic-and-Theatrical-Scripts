import { Skeleton } from '@/components/ui/Skeleton';
import styles from './PageSkeleton.module.css';

/** هيكل تحميل عام يظهر أثناء جلب بيانات الصفحة (يُستخدم في loading.tsx). */
export function PageSkeleton() {
  return (
    <div className={styles.root} role="status" aria-busy="true">
      <span className="visually-hidden">جارٍ التحميل…</span>
      <div className={styles.header}>
        <Skeleton height={44} width={44} radius={14} />
        <Skeleton height={30} width="55%" />
        <Skeleton height={16} width="35%" />
      </div>
      <div className={styles.body}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={150} radius={22} />
        ))}
      </div>
    </div>
  );
}
