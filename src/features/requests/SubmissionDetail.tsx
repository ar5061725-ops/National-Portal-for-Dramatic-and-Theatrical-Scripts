import { ROUTES } from '@/config/routes';
import { REQUEST_STATUS, REQUEST_STEPS } from '@/config/requests';
import { cn } from '@/lib/cn';
import type { FeedbackThread, RequestStatus } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RevisionForm } from '@/features/feedback/RevisionForm';
import styles from './SubmissionDetail.module.css';

/** رسالة توضيحية لكل حالة: ماذا حدث وماذا بعد؟ */
const STATUS_HINT: Record<RequestStatus, string> = {
  draft: 'هذا الطلب مسودة محفوظة ولم يُرسل بعد. أكمل بياناتك ثم تابع إلى الدفع.',
  awaiting_payment: 'اكتمل طلبك وبانتظار تأكيد الدفع. بعد التأكيد يدخل الطلب قائمة المراجعة.',
  received: 'استلمنا طلبك وسيُعيَّن له مراجعون قريباً.',
  review: 'طلبك قيد المراجعة لدى اللجنة المختصة، وستصلك رسالة عند صدور القرار.',
  revision: 'طلبت اللجنة بعض التعديلات. اقرأ الملاحظات ثم ارفع نسخة مستجيبة وردّك عليها.',
  approved: 'تمت إجازة نصك. يمكنك عرض الشهادة وطباعتها ومشاركتها.',
  rejected: 'صدر قرار برفض هذا الطلب. القرار مسبَّب أدناه، ويمكنك تقديم نصّ جديد.',
};

export function SubmissionDetail({ thread }: { thread: FeedbackThread }) {
  const { request, notes } = thread;
  const status = REQUEST_STATUS[request.status];

  return (
    <>
      <PageHeader
        start={<BackButton href={ROUTES.submissions} />}
        end={<Badge tone={status.tone}>{status.label}</Badge>}
        title={request.title}
        titleSize={24}
        subtitle={`${request.meta} · رقم الطلب ${request.no}`}
      />

      <PageBody>
        <Card padding={16} radius={20} gap={12}>
          <p className={styles.hint}>{STATUS_HINT[request.status]}</p>
          <ol className={styles.steps} aria-label="مراحل الطلب">
            {REQUEST_STEPS.map((label, i) => (
              <li key={label} className={cn(styles.step, i < request.step && styles.done)}>
                <span className={styles.bar} style={i < request.step ? { background: status.color } : undefined} />
                {label}
              </li>
            ))}
          </ol>
        </Card>

        {request.reason && (
          <Card padding={16} radius={20} gap={6}>
            <h2 className={styles.heading}>سبب القرار</h2>
            <p className={styles.reason}>{request.reason}</p>
          </Card>
        )}

        {notes.length > 0 && (
          <section aria-labelledby="notes-heading" className={styles.section}>
            <h2 id="notes-heading" className={styles.heading}>
              ملاحظات اللجنة
            </h2>
            <ol className={styles.notes}>
              {notes.map((note) => (
                <li key={note.no}>
                  <Card padding={14} radius={18}>
                    <div className={styles.note}>
                      <span className={styles.noteNo}>{note.no}</span>
                      <div className={styles.noteBody}>
                        <span className={styles.noteWhere}>{note.where}</span>
                        <p className={styles.noteText}>{note.text}</p>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        )}

        {request.status === 'revision' && <RevisionForm requestId={request.id} />}

        {request.status === 'approved' && request.scriptId && (
          <ButtonLink href={ROUTES.certificate(request.scriptId)} variant="successSoft" size="lg" block>
            عرض شهادة الإجازة
          </ButtonLink>
        )}
        {request.status === 'awaiting_payment' && (
          <ButtonLink href={ROUTES.payment(request.id)} size="xl" elevated block>
            متابعة إلى الدفع
          </ButtonLink>
        )}
        {request.status === 'rejected' && (
          <ButtonLink href={ROUTES.newSubmission} variant="outline" size="lg" block>
            تقديم نص جديد
          </ButtonLink>
        )}
      </PageBody>
    </>
  );
}
