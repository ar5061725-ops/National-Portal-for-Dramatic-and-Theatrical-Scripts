'use client';

import { useState } from 'react';
import { CURRENCY, PLACEHOLDERS } from '@/config/site';
import { ROUTES } from '@/config/routes';
import { PAYMENT_METHODS, REQUIRED_FILES } from '@/config/submission';
import { payForSubmission } from '@/lib/api/payment';
import { describeWork } from '@/lib/submission';
import { cn } from '@/lib/cn';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSubmission } from '@/providers/SubmissionProvider';
import type { PaymentMethodId } from '@/types';
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

export function PaymentFlow() {
  const { draft, hydrated, reset } = useSubmission();
  const [method, setMethod] = useState<PaymentMethodId>('knet');
  const payment = useAsyncAction((selected: PaymentMethodId) => payForSubmission(selected, draft));

  if (!hydrated) return <PageSkeleton />;

  // لا يوجد طلب قيد الإكمال (فتح مباشر للصفحة أو بعد انتهاء الجلسة)
  if (!draft.title.trim() && !payment.isSuccess) {
    return (
      <PageBody>
        <StatePanel tone="info" icon="edit" fill as="h1" title="لا يوجد طلب لإكماله" description="ابدأ بتعبئة بيانات نصك أولاً ثم عد إلى هنا لإتمام الدفع.">
          <ButtonLink href={ROUTES.submit} size="md">
            تقديم نص جديد
          </ButtonLink>
        </StatePanel>
      </PageBody>
    );
  }

  if (payment.isLoading) {
    return (
      <PageBody>
        <StatePanel tone="loading" fill title="جارٍ معالجة الدفع…" description="لا تغلق التطبيق، سيستغرق ذلك ثوانٍ قليلة" />
      </PageBody>
    );
  }

  if (payment.isSuccess) {
    return (
      <PageBody>
        <StatePanel
          tone="success"
          icon="check"
          fill
          as="h1"
          title="تم استلام نصك بنجاح"
          description="سيُراجع نصك من قبل اللجنة المختصة، وستصلك رسالة على بريدك الإلكتروني عند صدور القرار."
        >
          <p className={styles.orderNo}>
            رقم الطلب: <b dir="ltr">{payment.data?.orderNo}</b>
          </p>
          <ButtonLink href={ROUTES.home} size="lg" block onClick={reset}>
            العودة إلى الرئيسية
          </ButtonLink>
        </StatePanel>
      </PageBody>
    );
  }

  const uploaded = REQUIRED_FILES.filter((f) => draft.files[f.id]).length;

  return (
    <>
      <PageHeader rounded start={<BackButton href={ROUTES.submit} />} barTitle="بوابة الدفع" end={<Logo size={44} />}>
        <Stepper steps={STEPS} current={2} />
      </PageHeader>

      <PageBody gap={16}>
        <Card padding={18} gap={12}>
          <h2 className={styles.sectionTitle}>ملخص الطلب</h2>
          <SummaryRow label="العمل" value={draft.title} />
          <SummaryRow label="النوع" value={describeWork(draft)} />
          <SummaryRow label="المرفقات" value={`${uploaded} ملفات`} />
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
            <label key={m.id} className={cn('pressable', styles.method, m.id === method && styles.methodActive)}>
              <input
                type="radio"
                name="payment-method"
                value={m.id}
                checked={m.id === method}
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
            <span>{payment.error} — لم يُخصم أي مبلغ.</span>
          </div>
        )}

        <Button size="xl" elevated block onClick={() => void payment.run(method)}>
          {payment.isError ? 'إعادة المحاولة' : 'ادفع الآن'}
        </Button>
        <p className={styles.secure}>
          <Icon name="lock" size={14} strokeWidth={2} />
          دفع آمن ومشفّر
        </p>
      </PageBody>
    </>
  );
}
