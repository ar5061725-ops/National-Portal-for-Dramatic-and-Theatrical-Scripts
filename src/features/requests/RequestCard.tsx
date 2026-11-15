import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ROUTES } from '@/config/routes';
import { REQUEST_STATUS, REQUEST_STEPS } from '@/config/requests';
import { cn } from '@/lib/cn';
import type { ScriptRequest } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from './RequestCard.module.css';

type ActionVariant = 'warning' | 'successSoft' | 'primary' | 'secondary';

/** الإجراء الأنسب لكل حالة طلب. */
function getAction(request: ScriptRequest): { href: string; label: string; variant: ActionVariant } | null {
  switch (request.status) {
    case 'draft':
      return { href: ROUTES.newSubmission, label: 'إكمال المسودة', variant: 'secondary' };
    case 'awaiting_payment':
      return { href: ROUTES.payment(request.id), label: 'متابعة إلى الدفع', variant: 'primary' };
    case 'revision':
      return { href: ROUTES.submission(request.id), label: 'عرض الملاحظات والرد', variant: 'warning' };
    case 'approved':
      return request.scriptId
        ? { href: ROUTES.certificate(request.scriptId), label: 'شهادة الإجازة', variant: 'successSoft' }
        : null;
    default:
      return null;
  }
}

export function RequestCard({ request }: { request: ScriptRequest }) {
  const status = REQUEST_STATUS[request.status];
  const action = getAction(request);
  const detailsHref = request.status === 'draft' ? null : ROUTES.submission(request.id);

  return (
    <Card as="article" padding={18} elevated>
      <div className={styles.top}>
        <div className={styles.titles}>
          <h2 className={styles.title}>
            {detailsHref ? (
              <Link href={detailsHref} className={styles.titleLink}>
                {request.title}
              </Link>
            ) : (
              request.title
            )}
          </h2>
          <p className={styles.meta}>{request.meta}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <ol className={styles.steps} style={{ '--progress-color': status.color } as CSSProperties} aria-label="مراحل الطلب">
        {REQUEST_STEPS.map((label, i) => {
          const done = i < request.step;
          return (
            <li key={label} className={cn(styles.step, done && styles.done)} aria-current={i === request.step - 1 ? 'step' : undefined}>
              <span className={styles.bar} />
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>

      {request.reason && request.status === 'rejected' && <p className={styles.reason}>{request.reason}</p>}

      <div className={styles.footer}>
        <p className={styles.number}>
          {request.status === 'draft' ? (
            request.no
          ) : (
            <>
              رقم الطلب <span dir="ltr">{request.no}</span>
            </>
          )}
        </p>
        {action && (
          <ButtonLink href={action.href} variant={action.variant} size="sm">
            {action.label}
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}
