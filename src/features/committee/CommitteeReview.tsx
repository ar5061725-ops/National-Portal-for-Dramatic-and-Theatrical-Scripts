'use client';

import { useMemo, useState } from 'react';
import { ROUTES } from '@/config/routes';
import { DECISIONS, REVIEW_CRITERIA, REVIEW_POLICY } from '@/config/requests';
import { acknowledgeNoConflict, declareConflict, submitReview } from '@/lib/api/committee';
import { suggestedDecision, weightedTotal } from '@/lib/review';
import { cn } from '@/lib/cn';
import { scoreText } from '@/lib/text';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { CommitteeOverview, CriterionScoreInput, DecisionId, ReviewNoteInput } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatePanel } from '@/components/ui/StatePanel';
import { FormError } from '@/components/ui/FormError';
import { CriterionField } from './CriterionField';
import { DecisionPicker } from './DecisionPicker';
import { NoteEditor } from './NoteEditor';
import styles from './CommitteeReview.module.css';


function initialScores(): Record<string, CriterionScoreInput> {
  return Object.fromEntries(REVIEW_CRITERIA.map((c) => [c.id, { score: 5, rationale: '', locator: '' }]));
}

export function CommitteeReview({ overview }: { overview: CommitteeOverview }) {
  const [currentId, setCurrentId] = useState(overview.queue[0]?.id ?? '');
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set());
  const [conflict, setConflict] = useState(false);
  const [scores, setScores] = useState(initialScores);
  const [recommendation, setRecommendation] = useState<DecisionId | null>(null);
  const [notes, setNotes] = useState<ReviewNoteInput[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const ack = useAsyncAction(acknowledgeNoConflict);
  const conflictAction = useAsyncAction(declareConflict);
  const save = useAsyncAction(submitReview);

  const current = overview.queue.find((q) => q.id === currentId);
  const total = useMemo(() => weightedTotal(scores), [scores]);
  const suggested = suggestedDecision(total);
  const chosen = recommendation ?? suggested;
  const chosenLabel = DECISIONS.find((d) => d.id === chosen)?.label ?? '';
  const missing = REVIEW_CRITERIA.filter((c) => scores[c.id].rationale.trim().length < 3);
  const isAcknowledged = acknowledged.has(currentId);

  const stats = [
    { value: overview.stats.pending, label: 'بانتظار المراجعة' },
    { value: overview.stats.revised, label: 'تعديلات واردة' },
    { value: overview.stats.decided, label: 'تم البت فيها' },
  ];

  function selectItem(id: string) {
    setCurrentId(id);
    setConflict(false);
    setScores(initialScores());
    setRecommendation(null);
    setNotes([]);
    setShowErrors(false);
    ack.reset();
    conflictAction.reset();
    save.reset();
  }

  function patchScore(id: string, patch: Partial<CriterionScoreInput>) {
    setScores((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleAcknowledge() {
    const result = await ack.run(currentId);
    if (result === true) setAcknowledged((s) => new Set(s).add(currentId));
  }

  return (
    <>
      <PageHeader
        tone="dark"
        start={<BackButton href={ROUTES.login} />}
        end={<Badge tone="onDark">عضو لجنة المراجعة</Badge>}
        title="لوحة اللجنة"
        titleSize={24}
        subtitle="تقييم محجوب الهوية: يظهر لك رمز الطلب والوثائق المخصصة لك فقط"
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
                  onClick={() => selectItem(item.id)}
                  className={cn('pressable', styles.queueItem)}
                >
                  <span className={styles.queueText}>
                    <span dir="ltr" className={styles.queueTitle}>
                      {item.code}
                    </span>
                    <span className={styles.queueMeta}>{item.meta}</span>
                  </span>
                  <span className={styles.open}>فتح الملفات</span>
                </button>
              ))}
            </div>

            {conflictAction.isSuccess && current ? (
              <Card padding={26} radius={22}>
                <StatePanel
                  tone="info"
                  icon="shield"
                  title="تم تسجيل إعلان التعارض"
                  description={`سُحب تعيينك على الطلب ${current.code} وستُحال المراجعة إلى عضوٍ آخر. لا يمكنك الاطلاع على هذه النسخة بعد الآن.`}
                />
              </Card>
            ) : save.isSuccess && current ? (
              <Card padding={26} radius={22}>
                <StatePanel
                  tone="success"
                  icon="check"
                  title="أُرسل تقييمك وأُقفل"
                  description={`الطلب ${current.code}: المجموع ${scoreText(save.data?.total ?? total, 100)} وتوصيتك «${chosenLabel}». القرار النهائي للمشرف بعد اكتمال التقييمات، ولا يظهر للمؤلف شيء قبل نشر النتيجة.`}
                >
                  <Button variant="outline" size="md" onClick={() => selectItem(currentId)}>
                    مراجعة نص آخر
                  </Button>
                </StatePanel>
              </Card>
            ) : (
              current && (
                <Card as="section" padding={18} radius={22} gap={16}>
                  <div className={styles.formHead}>
                    <span className={styles.statLabelDark}>نسخة منزوعة الهوية</span>
                    <span dir="ltr" className={styles.currentTitle}>
                      {current.code}
                    </span>
                    <span className={styles.statLabelDark}>{current.meta}</span>
                  </div>

                  {!isAcknowledged ? (
                    <div className={styles.form}>
                      <p className={styles.conflictNote}>
                        قبل فتح الملفات: أقرّ بأنه لا تربطك بالمؤلف أو بالعمل علاقة مصلحة (قرابة، عمل مشترك، منافسة…). إن وُجد تعارض فأعلنه ليُحال الطلب إلى مراجع آخر.
                        {conflict ? ' عند الإعلان يُسحب تعيينك ويُسجَّل الإعلان في سجل التدقيق.' : ''}
                      </p>
                      <FormError>{ack.isError || conflictAction.isError ? (ack.error ?? conflictAction.error) : undefined}</FormError>
                      {conflict ? (
                        <>
                          <Button size="lg" block variant="danger" loading={conflictAction.isLoading} onClick={() => void conflictAction.run(current.id)}>
                            تأكيد إعلان التعارض
                          </Button>
                          <Button size="md" block variant="outline" onClick={() => setConflict(false)}>
                            رجوع
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="lg" block loading={ack.isLoading} onClick={() => void handleAcknowledge()}>
                            أقرّ بعدم وجود تعارض مصالح
                          </Button>
                          <Button size="md" block variant="outline" onClick={() => setConflict(true)}>
                            أعلن وجود تعارض
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <form
                      className={styles.form}
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (missing.length > 0) {
                          setShowErrors(true);
                          return;
                        }
                        void save.run({ itemId: current.id, scores, recommendation: chosen, notes });
                      }}
                    >
                      <div className={styles.scoreRow}>
                        <span className={styles.fieldLabel}>المجموع من 100 (موزون)</span>
                        <span dir="ltr" className={styles.scoreValue} aria-live="polite">
                          {scoreText(total, 100)}
                        </span>
                      </div>
                      <p className={styles.conflictNote}>
                        درجة كل معيار من 0 إلى 10 مضروبة في وزنه. الإجازة من {REVIEW_POLICY.approveMin} فأكثر، وطلب التعديل من {REVIEW_POLICY.reviseMin} إلى أقل من {REVIEW_POLICY.approveMin}، والرفض دون ذلك.
                      </p>

                      {REVIEW_CRITERIA.map((c) => (
                        <CriterionField key={c.id} label={c.label} hint={c.hint} weight={c.weight} value={scores[c.id]} showError={showErrors} onChange={(patch) => patchScore(c.id, patch)} />
                      ))}

                      <NoteEditor notes={notes} onChange={setNotes} />

                      <DecisionPicker label={`توصيتك (المقترحة بحسب المجموع: ${DECISIONS.find((d) => d.id === suggested)?.label})`} value={chosen} onChange={setRecommendation} />
                      <p className={styles.conflictNote}>القرار النهائي بيد المشرف؛ توصيتك تُرسل مع تقييمك ولا تُعدَّل بعد الإرسال.</p>

                      <FormError>{showErrors && missing.length > 0 ? `ينقص المبرر في ${missing.length} من المعايير.` : undefined}</FormError>
                      <FormError>{save.isError ? save.error : undefined}</FormError>

                      <Button type="submit" size="lg" block loading={save.isLoading}>
                        إرسال التقييم وقفله
                      </Button>
                    </form>
                  )}
                </Card>
              )
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
