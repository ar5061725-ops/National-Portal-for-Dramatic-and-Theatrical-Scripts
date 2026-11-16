'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROUTES } from '@/config/routes';
import { DECISIONS, REVIEW_POLICY } from '@/config/requests';
import { publishRoundResult, recordRoundDecision } from '@/lib/api/committee';
import { cn } from '@/lib/cn';
import { scoreText } from '@/lib/text';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { AssignableSubmission, DecisionId, ReviewerOption, RoundListItem, RoundStatus, RoundSummary } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Form } from '@/components/ui/Form';
import { FormError } from '@/components/ui/FormError';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea } from '@/components/ui/TextField';
import { AssignReviewerPanel } from './AssignReviewerPanel';
import { DecisionPicker } from './DecisionPicker';
import styles from './CommitteeReview.module.css';

const label = (id: DecisionId | null) => DECISIONS.find((d) => d.id === id)?.label ?? '—';

const STATUS_LABEL: Record<RoundStatus, string> = {
  collecting: 'جمع التقييمات',
  arbitration: 'تحكيم',
  awaiting_decision: 'بانتظار القرار',
  decided: 'اعتُمد ولم يُنشر',
  published: 'نُشرت',
  cancelled: 'أُلغيت',
};

interface RoundDecisionProps {
  rounds: RoundListItem[];
  summary: RoundSummary | null;
  assignable: AssignableSubmission[];
  reviewers: ReviewerOption[];
}

/** شاشة المشرف: تعيين المراجعين، قائمة الجولات، الدرجات المرسلة، اعتماد القرار ثم نشر النتيجة (خطوتان منفصلتان). */
export function RoundDecision({ rounds, summary, assignable, reviewers }: RoundDecisionProps) {
  return (
    <>
      <PageHeader
        tone="dark"
        start={<BackButton href={ROUTES.committee} />}
        end={<Badge tone="onDark">مشرف اللجنة</Badge>}
        title="قرارات الجولات"
        titleSize={24}
        subtitle="تعيين المراجعين، ودرجاتهم بلا هوية، ثم اعتماد القرار ونشره للمؤلف"
      />
      <PageBody>
        <AssignReviewerPanel submissions={assignable} reviewers={reviewers} />

        <Card as="section" padding={18} radius={22} gap={10}>
          <h2 className={styles.heading}>الجولات</h2>
          {rounds.length === 0 ? (
            <StatePanel tone="info" icon="clock" title="لا توجد جولات مفتوحة" description="تظهر الجولة بعد تعيين أول مراجع على طلب." />
          ) : (
            <div className={styles.queue} role="group" aria-label="الجولات">
              {rounds.map((r) => (
                <Link key={r.roundId} href={`${ROUTES.committeeDecisions}?round=${r.roundId}`} aria-current={summary?.roundId === r.roundId ? 'true' : undefined} className={cn('pressable', styles.queueItem)}>
                  <span className={styles.queueText}>
                    <span dir="ltr" className={styles.queueTitle}>
                      {r.code}
                    </span>
                    <span className={styles.queueMeta}>
                      {STATUS_LABEL[r.status]} · أُرسل {r.submittedCount}
                    </span>
                  </span>
                  <span className={styles.open}>{r.aggregateScore === null ? '—' : scoreText(r.aggregateScore, 100)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {summary && <RoundDetail key={summary.roundId} summary={summary} />}
      </PageBody>
    </>
  );
}

/** تفاصيل جولة واحدة؛ يُعاد إنشاؤها لكل جولة (key) فلا تتسرب حالة القرار بين الجولات. */
function RoundDetail({ summary }: { summary: RoundSummary }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<DecisionId>(summary.recommended ?? 'revise');
  const [authorReason, setAuthorReason] = useState('');
  const [internalReason, setInternalReason] = useState('');

  const decide = useAsyncAction(recordRoundDecision);
  const publish = useAsyncAction(async (decisionId: string) => {
    await publishRoundResult(decisionId);
    router.refresh();
    return true as const;
  });

  const decisionId = summary.decisionId ?? decide.data ?? null;
  const differs = summary ? outcome !== summary.recommended : false;

  async function handleDecide(event: React.FormEvent) {
    event.preventDefault();
    if (!summary) return;
    const id = await decide.run({ roundId: summary.roundId, outcome, authorReason, internalReason });
    if (id) router.refresh();
  }

  return (
<Card as="section" padding={18} radius={22} gap={14}>
            <span dir="ltr" className={styles.currentTitle}>
              {summary.code}
            </span>
            <ul className={styles.noteList}>
              {summary.reviews.map((r) => (
                <li key={r.label}>
                  <b>{r.label}{r.isArbitration ? ' (تحكيم)' : ''}:</b>{' '}
                  {r.conflictDeclared ? 'أعلن تعارضاً' : r.submitted ? `${scoreText(r.score ?? 0, 100)} — توصية: ${label(r.recommendation)}` : 'لم يُرسل بعد'}
                </li>
              ))}
            </ul>
            <div className={styles.scoreRow}>
              <span className={styles.fieldLabel}>{summary.reviews.some((r) => r.isArbitration) ? 'الوسيط بعد التحكيم' : 'متوسط المراجعين'}</span>
              <span dir="ltr" className={styles.scoreValue}>
                {summary.aggregateScore === null ? '—' : scoreText(summary.aggregateScore, 100)}
              </span>
            </div>
            <p className={styles.conflictNote}>
              التوصية الآلية: <b>{label(summary.recommended)}</b>. يُفتح التحكيم عند فرق ≥ {REVIEW_POLICY.gapThreshold} درجة أو اختلاف التوصية، ويُضاف مراجع ثالث، والنتيجة وسيط الثلاثة.
            </p>

            {summary.status === 'published' ? (
              <StatePanel tone="success" icon="check" title="نُشرت النتيجة للمؤلف" description="حُفظت لقطة غير قابلة للتعديل وأُرسل إشعار للمؤلف. أي تصحيح لاحق يتم بنسخة تصحيحية مسبَّبة." />
            ) : decisionId ? (
              <div className={styles.form}>
                <StatePanel tone="success" icon="check" title="اعتُمد القرار" description="لم يرَ المؤلف شيئاً بعد؛ النشر خطوة منفصلة." />
                <FormError>{publish.isError ? publish.error : undefined}</FormError>
                <Button size="lg" block loading={publish.isLoading} onClick={() => void publish.run(decisionId)}>
                  نشر النتيجة للمؤلف
                </Button>
              </div>
            ) : summary.status !== 'awaiting_decision' ? (
              <StatePanel tone="info" icon="clock" title="الجولة لم تكتمل بعد" description="يتاح القرار بعد اكتمال التقييمات أو التحكيم." />
            ) : (
              <Form onSubmit={handleDecide}>
                <DecisionPicker label="القرار" value={outcome} onChange={setOutcome} />
                <TextArea label="السبب الذي يراه المؤلف (مطلوب)" value={authorReason} onChange={(e) => setAuthorReason(e.target.value)} />
                {differs && (
                  <TextArea
                    label="مبرر مخالفة التوصية (داخلي، لا يراه المؤلف)"
                    hint="القرار يخالف التوصية الآلية فيلزم مبرر موثق."
                    value={internalReason}
                    onChange={(e) => setInternalReason(e.target.value)}
                  />
                )}
                <FormError>{decide.isError ? decide.error : undefined}</FormError>
                <Button type="submit" size="lg" block loading={decide.isLoading}>
                  اعتماد القرار
                </Button>
              </Form>
            )}
          </Card>
        
  );
}
