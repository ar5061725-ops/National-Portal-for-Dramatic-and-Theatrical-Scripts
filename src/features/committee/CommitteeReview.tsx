'use client';

import { useMemo, useState } from 'react';
import { ROUTES } from '@/config/routes';
import { DECISIONS, REVIEW_CRITERIA, REVIEW_POLICY } from '@/config/requests';
import { acknowledgeNoConflict, declareConflict, submitReview } from '@/lib/api/committee';
import { cn } from '@/lib/cn';
import { scoreBandLabel, suggestedDecision, weightedTotal } from '@/lib/review';
import { scoreText } from '@/lib/text';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { CommitteeOverview, CriterionScoreInput, DecisionId, ReviewNoteInput } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea, TextField } from '@/components/ui/TextField';
import styles from './CommitteeReview.module.css';

const SCORE_OPTIONS = Array.from({ length: 11 }, (_, i) => i);
const EMPTY_NOTE: ReviewNoteInput = { locator: '', body: '' };

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
  const [draftNote, setDraftNote] = useState<ReviewNoteInput>(EMPTY_NOTE);
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
    setDraftNote(EMPTY_NOTE);
    setShowErrors(false);
    ack.reset();
    conflictAction.reset();
    save.reset();
  }

  function patchScore(id: string, patch: Partial<CriterionScoreInput>) {
    setScores((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function addNote() {
    if (!draftNote.body.trim()) return;
    setNotes((n) => [...n, { ...draftNote, locator: draftNote.locator.trim() || 'عام', body: draftNote.body.trim() }]);
    setDraftNote(EMPTY_NOTE);
  }

  async function handleAcknowledge() {
    const result = await ack.run(currentId);
    if (result === true) setAcknowledged((s) => new Set(s).add(currentId));
  }

  const noteNeedsAction = draftNote.requiresRevision && !(draftNote.requiredAction?.trim() && draftNote.completionCriterion?.trim());

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
                  description={`الطلب ${current.code}: المجموع ${scoreText(save.data?.total ?? total)} من 100 وتوصيتك «${chosenLabel}». القرار النهائي للمشرف بعد اكتمال التقييمات، ولا يظهر للمؤلف شيء قبل نشر النتيجة.`}
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
                      {(ack.isError || conflictAction.isError) && (
                        <p role="alert" className={styles.error}>
                          {ack.error ?? conflictAction.error}
                        </p>
                      )}
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
                          {scoreText(total)}
                        </span>
                      </div>
                      <p className={styles.conflictNote}>
                        درجة كل معيار من 0 إلى 10 مضروبة في وزنه. الإجازة من {REVIEW_POLICY.approveMin} فأكثر، وطلب التعديل من {REVIEW_POLICY.reviseMin} إلى أقل من {REVIEW_POLICY.approveMin}، والرفض دون ذلك.
                      </p>

                      {REVIEW_CRITERIA.map((c) => {
                        const s = scores[c.id];
                        const invalid = showErrors && s.rationale.trim().length < 3;
                        return (
                          <fieldset key={c.id} className={styles.criteria}>
                            <legend className={styles.fieldLabel}>
                              {c.label} <span className={styles.statLabelDark}>· الوزن {c.weight}%</span>
                            </legend>
                            <p className={styles.statLabelDark}>{c.hint}</p>
                            <label className={styles.criterion}>
                              <span>
                                الدرجة: <b>{scoreBandLabel(s.score)}</b>
                              </span>
                              <select
                                aria-label={`درجة ${c.label}`}
                                value={s.score}
                                onChange={(e) => patchScore(c.id, { score: Number(e.target.value) })}
                                className={styles.select}
                              >
                                {SCORE_OPTIONS.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <TextArea
                              label="المبرر (مطلوب)"
                              value={s.rationale}
                              error={invalid ? 'اكتب مبرراً لهذه الدرجة' : undefined}
                              onChange={(e) => patchScore(c.id, { rationale: e.target.value })}
                            />
                            <TextField
                              label="موضع الشاهد (صفحة أو مشهد)"
                              placeholder="مثال: ص 12"
                              value={s.locator}
                              onChange={(e) => patchScore(c.id, { locator: e.target.value })}
                            />
                          </fieldset>
                        );
                      })}

                      <fieldset className={styles.criteria}>
                        <legend className={styles.fieldLabel}>ملاحظات مقترحة للمؤلف</legend>
                        <p className={styles.statLabelDark}>لا يراها المؤلف إلا إذا أقرّها المشرف عند نشر النتيجة.</p>
                        {notes.length > 0 && (
                          <ul className={styles.noteList}>
                            {notes.map((n, i) => (
                              <li key={`${n.locator}-${i}`}>
                                <b>{n.locator}:</b> {n.body}
                                {n.requiresRevision && <> — مطلوب: {n.requiredAction} (الإنجاز: {n.completionCriterion})</>}
                                <button type="button" className={styles.remove} onClick={() => setNotes((all) => all.filter((_, idx) => idx !== i))}>
                                  حذف
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <TextField
                          label="الموقع (صفحة أو مشهد)"
                          placeholder="مثال: المشهد 12"
                          value={draftNote.locator}
                          onChange={(e) => setDraftNote((d) => ({ ...d, locator: e.target.value }))}
                        />
                        <TextArea
                          label="الملاحظة"
                          placeholder="اكتب ملاحظتك المرتبطة بالمشهد أو الشخصية…"
                          value={draftNote.body}
                          onChange={(e) => setDraftNote((d) => ({ ...d, body: e.target.value }))}
                        />
                        <label className={styles.conflict}>
                          <input
                            type="checkbox"
                            checked={!!draftNote.requiresRevision}
                            onChange={(e) => setDraftNote((d) => ({ ...d, requiresRevision: e.target.checked, proposedForAuthor: true }))}
                          />
                          <span>تستلزم تعديلاً من المؤلف</span>
                        </label>
                        {draftNote.requiresRevision && (
                          <>
                            <TextField
                              label="الإجراء المطلوب"
                              value={draftNote.requiredAction ?? ''}
                              onChange={(e) => setDraftNote((d) => ({ ...d, requiredAction: e.target.value }))}
                            />
                            <TextField
                              label="معيار الإنجاز"
                              value={draftNote.completionCriterion ?? ''}
                              onChange={(e) => setDraftNote((d) => ({ ...d, completionCriterion: e.target.value }))}
                            />
                          </>
                        )}
                        <Button size="sm" variant="secondary" onClick={addNote} disabled={!draftNote.body.trim() || !!noteNeedsAction}>
                          إضافة الملاحظة
                        </Button>
                      </fieldset>

                      <div className={styles.fieldLabel} id="decision-label">
                        توصيتك (المقترحة بحسب المجموع: {DECISIONS.find((d) => d.id === suggested)?.label})
                      </div>
                      <div className={styles.decisions} role="group" aria-labelledby="decision-label">
                        {DECISIONS.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            aria-pressed={d.id === chosen}
                            data-tone={d.tone}
                            onClick={() => setRecommendation(d.id)}
                            className={cn('pressable', styles.decision)}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                      <p className={styles.conflictNote}>القرار النهائي بيد المشرف؛ توصيتك تُرسل مع تقييمك ولا تُعدَّل بعد الإرسال.</p>

                      {showErrors && missing.length > 0 && (
                        <p role="alert" className={styles.error}>
                          ينقص المبرر في {missing.length} من المعايير.
                        </p>
                      )}
                      {save.isError && (
                        <p role="alert" className={styles.error}>
                          {save.error}
                        </p>
                      )}

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
