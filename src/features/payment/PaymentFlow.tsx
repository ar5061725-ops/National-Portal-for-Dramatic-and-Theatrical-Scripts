'use client';

import { useState } from 'react';
import { CURRENCY, MESSAGES, PLACEHOLDERS } from '@/config/site';
import { ROUTES } from '@/config/routes';
import { PAYMENT_MESSAGES, PAYMENT_METHODS } from '@/config/payment';
import { REQUIRED_FILES } from '@/config/submission';
import { payForSubmission } from '@/lib/api/payment';
import { describeWork } from '@/lib/submission';
import { cn } from '@/lib/cn';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSubmission } from '@/providers/SubmissionProvider';
import { useToast } from '@/providers/ToastProvider';
import type { PaymentMethodId, PayableRequest } from '@/types';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { StatePanel } from '@/components/ui/StatePanel';
import { Stepper } from '@/components/ui/Stepper';
import styles from './PaymentFlow.module.css';

const STEPS = ['الحساب', 'بيانات العمل', 'الدفع'];

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}

interface PaymentFlowProps {
  /** رقم الطلب في الرابط (/payments/[id]). لا يمنح وحده أي وصول. */
  requestId: string;
  /** ملخص طلب سبق إرساله (يأتي من الخادم)؛ وإلا يُستخدم ملخص المسودة الحالية. */
  serverSummary: PayableRequest | null;
}

export function PaymentFlow({ requestId, serverSummary }: PaymentFlowProps) {
  const { draft, hydrated, reset } = useSubmission();
  const { showToast } = useToast();
  const [method, setMethod] = useState<PaymentMethodId>('knet');
  const payment = useAsyncAction((selected: PaymentMethodId) => payForSubmission(requestId, selected));

  if (!hydrated) return <PageSkeleton />;

  const fromDraft = draft.requestNo === requestId && draft.title.trim().length > 0;
  const summary: PayableRequest | null = fromDraft
    ? {
        id: requestId,
        title: draft.title,
        workDescription: describeWork(draft),
        filesCount: REQUIRED_FILES.filter((f) => draft.files[f.id]).length,
      }
    : serverSummary;

  // لا طلب مطابق للرابط (فتح مباشر، أو الطلب ليس لهذا الحساب)
  if (!summary && !payment.isSuccess) {
    return (
      <PageBody>
        <StatePanel tone="info" icon="edit" fill as="h1" title="لا يوجد طلب لإكماله" description="ابدأ بتعبئة بيانات نصك أولاً ثم تابع إلى الدفع من صفحة طلباتي.">
          <ButtonLink href={ROUTES.newSubmission} size="md">
            تقديم نص جديد
          </ButtonLink>
        </StatePanel>
      </PageBody>
    );
  }

  if (payment.isLoading) {
    return (
      <PageBody>
        <StatePanel tone="loading" fill title={PAYMENT_MESSAGES.pending} description="لا تغلق الصفحة، سيستغرق ذلك ثوانٍ قليلة" />
      </PageBody>
    );
  }

  if (payment.isSuccess) {
    return (
      <PageBody>
        <StatePanel tone="success" icon="check" fill as="h1" title="تم استلام نصك بنجاح" description={PAYMENT_MESSAGES.paid}>
          <p className={styles.orderNo}>
            رقم الطلب: <b dir="ltr">{payment.data?.orderNo}</b>
          </p>
          <p className={styles.nextStep}>سيُراجع نصك من قبل اللجنة المختصة، وستصلك رسالة على بريدك الإلكتروني عند صدور القرار.</p>
          <Button variant="secondary" size="md" block onClick={() => showToast(MESSAGES.receiptDownloaded)}>
            <Icon name="download" size={18} strokeWidth={2} />
            تحميل الإيصال
          </Button>
          <ButtonLink href={ROUTES.submissions} size="lg" block onClick={reset}>
            متابعة طلباتي
          </ButtonLink>
        </StatePanel>
      </PageBody>
    );
  }

  return (
    <>
      <PageHeader rounded start={<BackButton href={ROUTES.newSubmission} />} barTitle="بوابة الدفع" end={<Logo size={44} />}>
        <Stepper steps={STEPS} current={2} />
      </PageHeader>

      <PageBody gap={16}>
        <Card padding={18} gap={12}>
          <h2 className={styles.sectionTitle}>ملخص الطلب</h2>
          <SummaryRow label="رقم الطلب" value={requestId} />
          <SummaryRow label="العمل" value={summary?.title ?? ''} />
          <SummaryRow label="النوع" value={summary?.workDescription ?? ''} />
          <SummaryRow label="المرفقات" value={`${summary?.filesCount ?? 0} ملفات`} />
          <hr className={styles.divider} />
          <div className={styles.fee}>
            <span className={styles.sectionTitle}>رسوم التقديم</span>
            <span className={styles.feeAmount}>
              {PLACEHOLDERS.fee} {CURRENCY}
            </span>
          </div>
        </Card>

        <fieldset className={styles.methods}>
          <legend className={styles.sectionTitle}>اختر طريقة الدفع</legend>
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m.id}
              className={cn('pressable', styles.method, m.id === method && styles.methodActive, !m.available && styles.methodDisabled)}
            >
              <input
                type="radio"
                name="payment-method"
                value={m.id}
                checked={m.id === method}
                disabled={!m.available}
                onChange={() => setMethod(m.id)}
                className="visually-hidden"
              />
              <span className={styles.radio} aria-hidden="true" />
              <span className={styles.methodText}>
                <span className={styles.methodLabel}>{m.label}</span>
                <span className={styles.methodHint}>{m.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {payment.isError && (
          <div role="alert" className={styles.error}>
            <Icon name="alert" size={20} strokeWidth={2} />
            <span>
              {PAYMENT_MESSAGES.failed}
              <small className={styles.errorDetail}>{payment.error}</small>
            </span>
          </div>
        )}

        <Button size="xl" elevated block onClick={() => void payment.run(method)}>
          {payment.isError ? 'إعادة المحاولة' : 'ادفع الآن'}
        </Button>
        <p className={styles.secure}>
          <Icon name="lock" size={14} strokeWidth={2} />
          دفع آمن ومشفّر عبر صفحة المزوّد
        </p>
      </PageBody>
    </>
  );
}
