'use client';

import { useState } from 'react';
import { ROUTES } from '@/config/routes';
import { DECISIONS, REVIEW_POLICY } from '@/config/requests';
import { publishRoundResult, recordRoundDecision } from '@/lib/api/committee';
import { scoreText } from '@/lib/text';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { DecisionId, RoundSummary } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea } from '@/components/ui/TextField';
import { FormError } from '@/components/ui/FormError';
import { DecisionPicker } from './DecisionPicker';
import styles from './CommitteeReview.module.css';

const label = (id: DecisionId | null) => DECISIONS.find((d) => d.id === id)?.label ?? '—';

/** شاشة المشرف: الدرجات المرسلة، التحكيم، اعتماد القرار ثم نشر النتيجة للمؤلف كخطوتين منفصلتين. */
export function RoundDecision({ round }: { round: RoundSummary }) {
  const [outcome, setOutcome] = useState<DecisionId>(round.recommended ?? 'revise');
  const [authorReason, setAuthorReason] = useState('');
  const [internalReason, setInternalReason] = useState('');

  const decide = useAsyncAction(recordRoundDecision);
  const publish = useAsyncAction(publishRoundResult);
  const ready = round.status === 'awaiting_decision';
  const differs = outcome !== round.recommended;

  return (
    <>
      <PageHeader
        tone="dark"
        start={<BackButton href={ROUTES.committee} />}
        end={<Badge tone="onDark">مشرف اللجنة</Badge>}
        title="قرار الجولة"
        titleSize={24}
        subtitle="درجات المراجعين بلا هوية، ويُعتمد القرار ثم تُنشر النتيجة للمؤلف"
      />
      <PageBody>
        <Card as="section" padding={18} radius={22} gap={14}>
          <span dir="ltr" className={styles.currentTitle}>
            {round.code}
          </span>
          <ul className={styles.noteList}>
            {round.reviews.map((r) => (
              <li key={r.label}>
                <b>{r.label}:</b> {r.score === null ? 'لم يُرسل' : scoreText(r.score, 100)} — توصية: {label(r.recommendation)}
              </li>
            ))}
          </ul>
          <div className={styles.scoreRow}>
            <span className={styles.fieldLabel}>
              {round.reviews.some((r) => r.isArbitration) ? 'الوسيط بعد التحكيم' : 'متوسط المراجعين'}
            </span>
            <span dir="ltr" className={styles.scoreValue}>
              {round.aggregateScore === null ? '—' : scoreText(round.aggregateScore, 100)}
            </span>
          </div>
          <p className={styles.conflictNote}>
            التوصية الآلية: <b>{label(round.recommended)}</b>. يُفتح التحكيم عند فرق ≥ {REVIEW_POLICY.gapThreshold} درجة أو اختلاف التوصية، ويُضاف مراجع ثالث، والنتيجة وسيط الثلاثة.
          </p>

          {!ready ? (
            <StatePanel tone="info" icon="clock" title="الجولة لم تكتمل بعد" description="يتاح القرار بعد اكتمال التقييمات أو التحكيم." />
          ) : decide.isSuccess ? (
            publish.isSuccess ? (
              <StatePanel tone="success" icon="check" title="نُشرت النتيجة للمؤلف" description="حُفظت لقطة غير قابلة للتعديل وأُرسل إشعار للمؤلف. أي تصحيح لاحق يتم بنسخة تصحيحية مسبَّبة." />
            ) : (
              <div className={styles.form}>
                <StatePanel tone="success" icon="check" title={`اعتُمد القرار: ${label(outcome)}`} description="لم يرَ المؤلف شيئاً بعد؛ النشر خطوة منفصلة." />
                <FormError>{publish.isError ? publish.error : undefined}</FormError>
                <Button size="lg" block loading={publish.isLoading} onClick={() => void publish.run(round.roundId)}>
                  نشر النتيجة للمؤلف
                </Button>
              </div>
            )
          ) : (
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                void decide.run({ roundId: round.roundId, outcome, authorReason, internalReason });
              }}
            >
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
            </form>
          )}
        </Card>
      </PageBody>
    </>
  );
}
