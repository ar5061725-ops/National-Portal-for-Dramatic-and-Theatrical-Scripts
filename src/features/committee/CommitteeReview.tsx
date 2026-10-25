'use client';

import { useState } from 'react';
import { ROUTES } from '@/config/routes';
import { DECISIONS } from '@/config/requests';
import { submitDecision } from '@/lib/api/committee';
import { cn } from '@/lib/cn';
import { scoreText } from '@/lib/text';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { CommitteeOverview, DecisionId } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea } from '@/components/ui/TextField';
import styles from './CommitteeReview.module.css';

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

export function CommitteeReview({ overview }: { overview: CommitteeOverview }) {
  const [currentId, setCurrentId] = useState(overview.queue[0]?.id ?? '');
  const [score, setScore] = useState(8);
  const [decision, setDecision] = useState<DecisionId>('approve');
  const [notes, setNotes] = useState('');
  const save = useAsyncAction(submitDecision);

  const current = overview.queue.find((q) => q.id === currentId);
  const decisionLabel = DECISIONS.find((d) => d.id === decision)?.label ?? '';
  const stats = [
    { value: overview.stats.pending, label: 'بانتظار المراجعة' },
    { value: overview.stats.revised, label: 'تعديلات واردة' },
    { value: overview.stats.decided, label: 'تم البت فيها' },
  ];

  function selectScript(id: string) {
    setCurrentId(id);
    setNotes('');
    save.reset();
  }

  return (
    <>
      <PageHeader
        tone="dark"
        start={<BackButton href={ROUTES.login} />}
        end={<Badge tone="onDark">عضو لجنة المراجعة</Badge>}
        title="لوحة اللجنة"
        titleSize={24}
      >
        <div className={styles.stats}>
          {stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </PageHeader>

      <PageBody>
        <h2 className={styles.heading}>اختر نصاً للمراجعة</h2>

        {overview.queue.length === 0 ? (
          <StatePanel boxed icon="fileCheck" title="لا توجد نصوص بانتظار المراجعة" />
        ) : (
          <div className={styles.layout}>
            <div className={styles.queue} role="group" aria-label="نصوص بانتظار المراجعة">
              {overview.queue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === currentId}
                  onClick={() => selectScript(item.id)}
                  className={cn('pressable', styles.queueItem)}
                >
                  <span className={styles.queueText}>
                    <span className={styles.queueTitle}>{item.title}</span>
                    <span className={styles.queueMeta}>{item.meta}</span>
                  </span>
                  <span className={styles.open}>فتح الملفات</span>
                </button>
              ))}
            </div>

            {save.isSuccess && current ? (
              <Card padding={26} radius={22}>
                <StatePanel
                  tone="success"
                  icon="check"
                  title="تم اعتماد القرار"
                  description={`النص «${current.title}»: ${decisionLabel} بتقييم ${scoreText(score)}، وأُرسل إشعار للمؤلف.`}
                >
                  <Button variant="outline" size="md" onClick={() => selectScript(currentId)}>
                    مراجعة نص آخر
                  </Button>
                </StatePanel>
              </Card>
            ) : (
              current && (
                <Card as="section" padding={18} radius={22} gap={16}>
                  <form
                    className={styles.form}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save.run({ scriptId: current.id, score, decision, notes });
                    }}
                  >
                    <div className={styles.formHead}>
                      <span className={styles.statLabelDark}>تقييم النص</span>
                      <span className={styles.currentTitle}>{current.title}</span>
                    </div>

                    <div className={styles.scoreRow}>
                      <span className={styles.fieldLabel}>الدرجة من 10</span>
                      <span dir="ltr" className={styles.scoreValue}>
                        {scoreText(score)}
                      </span>
                    </div>
                    <div className={styles.scores} role="group" aria-label="الدرجة">
                      {SCORES.map((n) => (
                        <button key={n} type="button" aria-pressed={n === score} onClick={() => setScore(n)} className={cn('pressable', styles.scoreButton)}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className={styles.stars}>
                      <StarRating value={score} size={24} decorative />
                    </div>

                    <TextArea label="ملاحظات للمؤلف" placeholder="اكتب ملاحظاتك مرتبطة بالمشهد أو الشخصية…" value={notes} onChange={(e) => setNotes(e.target.value)} />

                    <div className={styles.fieldLabel} id="decision-label">
                      القرار
                    </div>
                    <div className={styles.decisions} role="group" aria-labelledby="decision-label">
                      {DECISIONS.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          aria-pressed={d.id === decision}
                          data-tone={d.tone}
                          onClick={() => setDecision(d.id)}
                          className={cn('pressable', styles.decision)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>

                    {save.isError && (
                      <p role="alert" className={styles.error}>
                        {save.error}
                      </p>
                    )}

                    <Button type="submit" size="lg" block loading={save.isLoading}>
                      اعتماد القرار
                    </Button>
                  </form>
                </Card>
              )
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
