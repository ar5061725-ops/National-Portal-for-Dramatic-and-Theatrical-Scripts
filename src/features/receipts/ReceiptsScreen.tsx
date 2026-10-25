import { ROUTES } from '@/config/routes';
import { CURRENCY } from '@/config/site';
import type { Receipt } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { StatePanel } from '@/components/ui/StatePanel';
import { DownloadReceiptButton } from './DownloadReceiptButton';
import styles from './ReceiptsScreen.module.css';

interface ReceiptsScreenProps {
  receipts: Receipt[];
  totalLabel: string;
}

export function ReceiptsScreen({ receipts, totalLabel }: ReceiptsScreenProps) {
  return (
    <>
      <PageHeader start={<BackButton href={ROUTES.profile} />} end={<Logo size={44} />} title="الإيصالات والمدفوعات" titleSize={24}>
        <div className={styles.total}>
          <span className={styles.totalLabel}>إجمالي المدفوع · {receipts.length} عمليات</span>
          <span className={styles.totalValue}>
            {totalLabel} {CURRENCY}
          </span>
        </div>
      </PageHeader>

      <PageBody grid gap={12}>
        {receipts.map((r) => (
          <Card key={r.id} as="article" padding={16} radius={20} gap={12}>
            <div className={styles.row}>
              <span className={styles.icon}>
                <Icon name="receipt" size={22} strokeWidth={2} />
              </span>
              <div className={styles.text}>
                <h2 className={styles.title}>رسوم تقديم «{r.title}»</h2>
                <p className={styles.meta}>
                  {r.method} · {r.dateLabel}
                </p>
              </div>
              <span className={styles.amount}>
                {r.amountLabel} {CURRENCY}
              </span>
            </div>
            <div className={styles.footer}>
              <Badge tone="success">مدفوع</Badge>
              <DownloadReceiptButton />
            </div>
          </Card>
        ))}
        {receipts.length === 0 && (
          <div data-span="full">
            <StatePanel boxed icon="receipt" title="لا توجد مدفوعات بعد" description="ستظهر إيصالاتك هنا بعد أول عملية دفع." />
          </div>
        )}
      </PageBody>
    </>
  );
}
