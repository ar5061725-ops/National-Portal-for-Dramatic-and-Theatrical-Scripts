'use client';

import { useState } from 'react';
import { CURRENCY, MESSAGES } from '@/config/site';
import { ROUTES } from '@/config/routes';
import { PAYMENT_MESSAGES, PAYMENT_METHODS } from '@/config/payment';
import { startPayment } from '@/lib/api/payment';
import { cn } from '@/lib/cn';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useToast } from '@/providers/ToastProvider';
import type { PaidResult, PaymentMethodId, PayableRequest } from '@/types';
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
  /** دفع مؤكد من الخادم (بعد العودة من المزوّد أو الويبهوك). */
  paid: PaidResult | null;
  /** عاد المستخدم من المزوّد والدفع لم يكتمل. */
  returnFailed: boolean;
}

export function PaymentFlow({ requestId, serverSummary, paid, returnFailed }: PaymentFlowProps) {
  const { showToast } = useToast();
  const [method, setMethod] = useState<PaymentMethodId>('knet');
  const payment = useAsyncAction((selected: PaymentMethodId) => startPayment(serverSummary?.submissionId ?? '', selected));
  const summary = serverSummary;

  // دفع مؤكد من الخادم
  if (paid) {
    return (
      <PageBody>
        <StatePanel tone="success" icon="check" fill as="h1" title="تم استلام نصك بنجاح" description={PAYMENT_MESSAGES.paid}>
          <p className={styles.orderNo}>
            رقم الطلب: <b dir="ltr">{paid.publicNo}</b>
          </p>
          {paid.receiptNo && (
            <p className={styles.orderNo}>
              رقم الإيصال: <b dir="ltr">{paid.receiptNo}</b>
            </p>
          )}
          <p className={styles.nextStep}>سيُراجع نصك من قبل اللجنة المختصة، وستصلك رسالة على بريدك الإلكتروني عند صدور القرار.</p>
          <Button variant="secondary" size="md" block onClick={() => showToast(MESSAGES.receiptDownloaded)}>
            <Icon name="download" size={18} strokeWidth={2} />
            تحميل الإيصال
          </Button>
          <ButtonLink href={ROUTES.submissions} size="lg" block>
            متابعة طلباتي
          </ButtonLink>
        </StatePanel>
      </PageBody>
    );
  }

  // لا طلب مطابق للرابط (فتح مباشر، أو الطلب ليس لهذا الحساب أو لا ينتظر الدفع)
  if (!summary) {
    return (
      <PageBody>
        <StatePanel tone="info" icon="edit" fill as="h1" title="لا يوجد طلب بانتظار الدفع" description="ابدأ بتقديم نص جديد، أو افتح طلباتي لمتابعة حالة طلبك.">
          <ButtonLink href={ROUTES.newSubmission} size="md">
            تقديم نص جديد
          </ButtonLink>
        </StatePanel>
      </PageBody>
    );
  }

  // أُنشئت الفاتورة وجارٍ تحويلك لصفحة المزوّد
  if (payment.isLoading || payment.isSuccess) {
    return (
      <PageBody>
        <StatePanel tone="loading" fill title="جارٍ تحويلك إلى صفحة الدفع" description="لا تغلق الصفحة، سيستغرق ذلك ثوانٍ قليلة" />
      </PageBody>
    );
  }

  const feeText = summary.feeMinor == null ? '—' : (summary.feeMinor / 1000).toFixed(3);

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
              {feeText} {CURRENCY}
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

        {(payment.isError || returnFailed) && (
          <div role="alert" className={styles.error}>
            <Icon name="alert" size={20} strokeWidth={2} />
            <span>
              {PAYMENT_MESSAGES.failed}
              <small className={styles.errorDetail}>{payment.error}</small>
            </span>
          </div>
        )}

        <Button size="xl" elevated block onClick={() => void payment.run(method)}>
          {payment.isError || returnFailed ? 'إعادة المحاولة' : 'ادفع الآن'}
        </Button>
        <p className={styles.secure}>
          <Icon name="lock" size={14} strokeWidth={2} />
          دفع آمن ومشفّر عبر صفحة المزوّد
        </p>
      </PageBody>
    </>
  );
}
