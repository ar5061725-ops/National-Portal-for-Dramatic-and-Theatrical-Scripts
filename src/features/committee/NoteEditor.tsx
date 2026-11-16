import { useState } from 'react';
import type { ReviewNoteInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/TextField';
import styles from './CommitteeReview.module.css';

const EMPTY_NOTE: ReviewNoteInput = { locator: '', body: '' };

interface NoteEditorProps {
  notes: ReviewNoteInput[];
  onChange: (notes: ReviewNoteInput[]) => void;
}

/** ملاحظات مقترحة للمؤلف: قائمة + نموذج إضافة (مع الإجراء المطلوب ومعيار الإنجاز عند الاستلزام). */
export function NoteEditor({ notes, onChange }: NoteEditorProps) {
  const [draft, setDraft] = useState<ReviewNoteInput>(EMPTY_NOTE);
  const needsAction = draft.requiresRevision && !(draft.requiredAction?.trim() && draft.completionCriterion?.trim());

  function add() {
    if (!draft.body.trim()) return;
    onChange([...notes, { ...draft, locator: draft.locator.trim() || 'عام', body: draft.body.trim() }]);
    setDraft(EMPTY_NOTE);
  }

  return (
    <fieldset className={styles.criteria}>
      <legend className={styles.fieldLabel}>ملاحظات مقترحة للمؤلف</legend>
      <p className={styles.statLabelDark}>لا يراها المؤلف إلا إذا أقرّها المشرف عند نشر النتيجة.</p>
      {notes.length > 0 && (
        <ul className={styles.noteList}>
          {notes.map((n, i) => (
            <li key={`${n.locator}-${i}`}>
              <b>{n.locator}:</b> {n.body}
              {n.requiresRevision && (
                <>
                  {' '}
                  — مطلوب: {n.requiredAction} (الإنجاز: {n.completionCriterion})
                </>
              )}
              <button type="button" className={styles.remove} onClick={() => onChange(notes.filter((_, idx) => idx !== i))}>
                حذف
              </button>
            </li>
          ))}
        </ul>
      )}
      <TextField label="الموقع (صفحة أو مشهد)" placeholder="مثال: المشهد 12" value={draft.locator} onChange={(e) => setDraft((d) => ({ ...d, locator: e.target.value }))} />
      <TextArea label="الملاحظة" placeholder="اكتب ملاحظتك المرتبطة بالمشهد أو الشخصية…" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
      <label className={styles.conflict}>
        <input type="checkbox" checked={!!draft.requiresRevision} onChange={(e) => setDraft((d) => ({ ...d, requiresRevision: e.target.checked, proposedForAuthor: true }))} />
        <span>تستلزم تعديلاً من المؤلف</span>
      </label>
      {draft.requiresRevision && (
        <>
          <TextField label="الإجراء المطلوب" value={draft.requiredAction ?? ''} onChange={(e) => setDraft((d) => ({ ...d, requiredAction: e.target.value }))} />
          <TextField label="معيار الإنجاز" value={draft.completionCriterion ?? ''} onChange={(e) => setDraft((d) => ({ ...d, completionCriterion: e.target.value }))} />
        </>
      )}
      <Button size="sm" variant="secondary" onClick={add} disabled={!draft.body.trim() || !!needsAction}>
        إضافة الملاحظة
      </Button>
    </fieldset>
  );
}
