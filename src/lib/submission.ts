import { LOGLINE_MAX, REQUIRED_FILES, getWorkType } from '@/config/submission';
import type { SubmissionDraft } from '@/types';

export function describeWork(draft: SubmissionDraft): string {
  const type = getWorkType(draft.type);
  const raw = draft.details[`${type.id}.${type.length.fieldId}`]?.trim();
  return raw ? `${type.label} · ${type.length.format(raw)}` : type.label;
}

export function countUploadedFiles(draft: SubmissionDraft): number {
  return REQUIRED_FILES.filter((f) => draft.files[f.id]).length;
}

/** يعيد قائمة بما ينقص الطلب قبل الانتقال إلى الدفع. */
export function getMissingSteps(draft: SubmissionDraft): string[] {
  const missing: string[] = [];
  if (!draft.title.trim()) missing.push('اكتب عنوان العمل في الخطوة 2');
  const type = getWorkType(draft.type);
  const length = Number(draft.details[`${type.id}.${type.length.fieldId}`]);
  if (!Number.isInteger(length) || length < 1) missing.push(`أدخل ${type.fields.find((f) => f.id === type.length.fieldId)?.label ?? 'تفاصيل العمل'} في الخطوة 3`);
  if (!draft.logline.trim()) missing.push('اكتب اللوجلاين في الخطوة 4');
  const remaining = REQUIRED_FILES.length - countUploadedFiles(draft);
  if (remaining > 0) missing.push(`ارفع ${remaining} من الملفات المطلوبة في الخطوة 5 (المظللة بالأحمر)`);
  return missing;
}

export { LOGLINE_MAX };
