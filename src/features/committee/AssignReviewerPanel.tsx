'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { assignReviewer } from '@/lib/api/committee';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { AssignableSubmission, ReviewerOption } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Form } from '@/components/ui/Form';
import { FormError } from '@/components/ui/FormError';
import { StatePanel } from '@/components/ui/StatePanel';
import styles from './CommitteeReview.module.css';

interface AssignReviewerPanelProps {
  submissions: AssignableSubmission[];
  reviewers: ReviewerOption[];
}

/** تعيين مراجع على طلب مختوم (مراجعان في البداية، والثالث عند التحكيم). المراجع لا يرى هوية المؤلف. */
export function AssignReviewerPanel({ submissions, reviewers }: AssignReviewerPanelProps) {
  const router = useRouter();
  const [versionId, setVersionId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const assign = useAsyncAction(assignReviewer);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!versionId || !reviewerId) return;
    const result = await assign.run(versionId, reviewerId);
    if (result === true) {
      // نجاح: نحدّث القوائم ونفرّغ المراجع للتعيين التالي
      setReviewerId('');
      router.refresh();
    }
  }

  return (
    <Card as="section" padding={18} radius={22} gap={12}>
      <h2 className={styles.heading}>تعيين مراجعين</h2>
      {submissions.length === 0 ? (
        <StatePanel tone="info" icon="fileCheck" title="لا توجد طلبات بانتظار التعيين" description="تظهر هنا الطلبات المستلمة التي لم يكتمل تعيين مراجعيها." />
      ) : reviewers.length === 0 ? (
        <StatePanel tone="info" icon="alert" title="لا يوجد مراجعون" description="امنح دور «مراجع» لحسابات اللجنة من لوحة Supabase (جدول user_roles)." />
      ) : (
        <Form onSubmit={handleSubmit}>
          <label className={styles.criterion}>
            <span>الطلب</span>
            <select className={styles.select} value={versionId} onChange={(e) => setVersionId(e.target.value)} aria-label="الطلب">
              <option value="">اختر…</option>
              {submissions.map((s) => (
                <option key={s.versionId} value={s.versionId}>
                  {s.code} · {s.meta} · معيَّن {s.assignedCount}
                  {s.roundStatus === 'arbitration' ? ' (تحكيم)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.criterion}>
            <span>المراجع</span>
            <select className={styles.select} value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} aria-label="المراجع">
              <option value="">اختر…</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <FormError>{assign.isError ? assign.error : undefined}</FormError>
          <Button type="submit" size="lg" block loading={assign.isLoading} disabled={!versionId || !reviewerId}>
            تعيين المراجع
          </Button>
        </Form>
      )}
    </Card>
  );
}
