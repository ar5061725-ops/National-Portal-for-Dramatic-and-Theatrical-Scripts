'use client';

import { useMemo, useState } from 'react';
import { ROUTES } from '@/config/routes';
import { DECISIONS, REVIEW_CRITERIA } from '@/config/requests';
import { declareConflict, submitDecision } from '@/lib/api/committee';
import { cn } from '@/lib/cn';
import { scoreText } from '@/lib/text';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { CommitteeOverview, DecisionId, ReviewNoteInput } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea, TextField } from '@/components/ui/TextField';
import styles from './CommitteeReview.module.css';

const SCORE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const DEFAULT_CRITERION_SCORE = 7;

export function CommitteeReview({ overview }: { overview: CommitteeOverview }) {
  const [currentId, setCurrentId] = useState(overview.queue[0]?.id ?? '');
  const [criteria, setCriteria] = useState<Record<string, number>>(() =>
    Object.fromEntries(REVIEW_CRITERIA.map((c) => [c.id, DEFAULT_CRITERION_SCORE])),
  );
  const [decision, setDecision] = useState<DecisionId>('approve');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState<ReviewNoteInput[]>([]);
  const [draftNote, setDraftNote] = useState<ReviewNoteInput>({ locator: '', body: '' });
  const [conflict, setConflict] = useState(false);

  const save = useAsyncAction(submitDecision);
  const conflictAction = useAsyncAction(declareConflict);

  const current = overview.queue.find((q) => q.id === currentId);
  const decisionLabel = DECISIONS.find((d) => d.id === decision)?.label ?? '';
  /** الدرجة النهائية: متوسط درجات المعايير، بخانة عشرية واحدة. */
  const score = useMemo(() => {
    const values = Object.values(criteria);
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }, [criteria]);

  const stats = [
    { value: overview.stats.pending, label: 'بانتظار المراجعة' },
    { value: overview.stats.revised, label: 'تعديلات واردة' },
    { value: overview.stats.decided, label: 'تم البت فيها' },
  ];

  function selectItem(id: string) {
    setCurrentId(id);
    setNotes([]);
    setDraftNote({ locator: '', body: '' });
    setReason('');
    setConflict(false);
    save.reset();
    conflictAction.reset();
  }

  function addNote() {
    if (!draftNote.body.trim()) return;
    setNotes((n) => [...n, { locator: draftNote.locator.trim() || 'عام', body: draftNote.body.trim() }]);
    setDraftNote({ locator: '', body: '' });
  }

  async function handleConflict() {
    if (!current) return;
    await conflictAction.run(current.id);
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
                  title="تم اعتماد القرار"
                  description={`الطلب ${current.code}: ${decisionLabel} بتقييم ${scoreText(score)}. حُفظ القرار مسبَّباً وأُرسل إشعار للمؤلف.`}
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

                  <label className={styles.conflict}>
                    <input type="checkbox" checked={conflict} onChange={(e) => setConflict(e.target.checked)} />
                    <span>أعلن وجود تعارض مصالح مع هذا الطلب</span>
                  </label>

                  {conflict ? (
                    <div className={styles.form}>
                      <p className={styles.conflictNote}>
                        عند الإعلان يُسحب تعيينك وتُحال النسخة إلى مراجع آخر، ويُسجَّل الإعلان في سجل التدقيق.
                      </p>
                      {conflictAction.isError && (
                        <p role="alert" className={styles.error}>
                          {conflictAction.error}
                        </p>
                      )}
                      <Button size="lg" block variant="danger" loading={conflictAction.isLoading} onClick={() => void handleConflict()}>
                        تأكيد إعلان التعارض
                      </Button>
                    </div>
                  ) : (
                    <form
                      className={styles.form}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void save.run({ itemId: current.id, criteria, score, decision, reason, notes });
                      }}
                    >
                      <div className={styles.scoreRow}>
                        <span className={styles.fieldLabel}>الدرجة من 10 (متوسط المعايير)</span>
                        <span dir="ltr" className={styles.scoreValue}>
                          {scoreText(score)}
                        </span>
                      </div>
                      <div className={styles.stars}>
                        <StarRating value={Math.round(score)} size={24} decorative />
                      </div>

                      <fieldset className={styles.criteria}>
                        <legend className={styles.fieldLabel}>معايير التقييم</legend>
                        {REVIEW_CRITERIA.map((c) => (
                          <label key={c.id} className={styles.criterion}>
                            <span>{c.label}</span>
                            <select
                              value={criteria[c.id]}
                              onChange={(e) => setCriteria((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))}
                              className={styles.select}
                            >
                              {SCORE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </fieldset>

                      <fieldset className={styles.criteria}>
                        <legend className={styles.fieldLabel}>ملاحظات مرتبطة بصفحة أو مشهد</legend>
                        {notes.length > 0 && (
                          <ul className={styles.noteList}>
                            {notes.map((n, i) => (
                              <li key={`${n.locator}-${i}`}>
                                <b>{n.locator}:</b> {n.body}
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
                        <Button size="sm" variant="secondary" onClick={addNote} disabled={!draftNote.body.trim()}>
                          إضافة الملاحظة
                        </Button>
                      </fieldset>

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

                      <TextArea
                        label="سبب القرار (مطلوب)"
                        hint="القرار النهائي يجب أن يكون مسبَّباً، ويبقى مرتبطاً بالنسخة والملفات."
                        value={reason}
                        error={save.isError && !reason.trim() ? 'اكتب سبب القرار' : undefined}
                        onChange={(e) => setReason(e.target.value)}
                      />

                      {save.isError && (
                        <p role="alert" className={styles.error}>
                          {save.error}
                        </p>
                      )}

                      <Button type="submit" size="lg" block loading={save.isLoading}>
                        اعتماد القرار
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
