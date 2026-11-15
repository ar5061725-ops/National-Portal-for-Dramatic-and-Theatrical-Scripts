import { REQUIRED_FILES } from '@/config/submission';
import { getSupabase } from '@/lib/supabase/client';
import type { RequiredFileId, SubmissionDraft } from '@/types';
import { ApiError } from './client';

/** تقديم نص جديد من المتصفح: مسودة ← تحديث البيانات ← رفع الملفات ← فحصها ← الإرسال (كلها عبر RPC وRLS). */

const BUCKET = 'submissions-portal';

/** رمز ملف المتصفح ← نوع الملف في القاعدة */
const FILE_KIND: Record<RequiredFileId, string> = {
  exec: 'executive',
  treatment: 'treatment',
  author: 'author_profile',
  script: 'script',
};

export interface SubmitResult {
  submissionId: string;
  publicNo: string;
  status: 'awaiting_payment' | 'received';
}

const ERROR_MESSAGES: Record<string, string> = {
  submissions_closed: 'باب التقديم مغلق حالياً',
  work_type_disabled: 'هذا النوع من الأعمال غير متاح حالياً',
  incomplete_fields: 'أكمل عنوان العمل واللوجلاين',
  version_sealed: 'تم إرسال هذه النسخة سابقاً',
  invalid_genre: 'التصنيف المختار غير معتمد',
  forbidden: 'ليس لديك صلاحية التقديم بهذا الحساب',
};

function toApiError(message: string): ApiError {
  const key = Object.keys(ERROR_MESSAGES).find((k) => message.includes(k));
  if (message.includes('incomplete_files')) return new ApiError('لم تكتمل الملفات الأربعة المطلوبة أو لم يجتز أحدها الفحص', 422);
  return new ApiError(key ? ERROR_MESSAGES[key] : 'تعذّر إكمال التقديم، حاول مرة أخرى', 500);
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** يحوّل حقول النموذج إلى أعمدة النسخة بحسب نوع العمل. */
function buildPatch(draft: SubmissionDraft): Record<string, unknown> {
  const num = (id: string): number | null => {
    const raw = draft.details[`${draft.type}.${id}`]?.trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const patch: Record<string, unknown> = {
    title: draft.title.trim(),
    logline: draft.logline.trim(),
    genre_codes: draft.genres,
    work_registry_no: draft.workNo.trim(),
  };
  if (draft.type === 'series') {
    patch.episodes_count = num('episodes');
    patch.duration_minutes = num('episodeDuration');
  } else if (draft.type === 'play') {
    patch.acts_count = num('chapters');
    patch.duration_minutes = num('duration');
  } else {
    patch.duration_minutes = num('duration');
  }
  return patch;
}

export interface SubmitInput {
  draft: SubmissionDraft;
  files: Partial<Record<RequiredFileId, File>>;
  /** نسخة سبق إنشاؤها لهذا الطلب (لاستئناف محاولة فاشلة دون تكرار الطلبات) */
  versionId?: string;
  onVersion?: (versionId: string) => void;
}

export async function submitNewSubmission({ draft, files, versionId, onVersion }: SubmitInput): Promise<SubmitResult> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new ApiError('انتهت جلستك، سجّل الدخول من جديد', 401);

  for (const f of REQUIRED_FILES) {
    if (!files[f.id]) throw new ApiError(`أعد رفع الملف «${f.label}» (لا يبقى الملف بعد إعادة تحميل الصفحة)`, 422);
  }

  // 1) مسودة جديدة، أو استئناف المسودة المنشأة في محاولة سابقة
  let version = versionId;
  let submissionId = '';
  let publicNo = '';
  if (!version) {
    const { data, error } = await supabase.rpc('create_submission_draft', { p_work_type: draft.type });
    if (error) throw toApiError(error.message);
    version = data.version_id as string;
    submissionId = data.submission_id as string;
    publicNo = data.public_no as string;
    onVersion?.(version);
  }

  // 2) بيانات العمل
  const { error: patchError } = await supabase.rpc('update_draft_version', { p_version_id: version, p_patch: buildPatch(draft) });
  if (patchError) throw toApiError(patchError.message);

  // 3) رفع الملفات إلى مجلد المؤلف ثم تسجيلها (المسار عشوائي وفق سياسة التخزين)
  for (const f of REQUIRED_FILES) {
    const file = files[f.id]!;
    const key = `${auth.user.id}/${version}/${crypto.randomUUID().replace(/-/g, '')}.pdf`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(key, file, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw new ApiError(`تعذّر رفع «${f.label}»، تحقق من الاتصال وأعد المحاولة`, 500);
    const { error: registerError } = await supabase.rpc('register_submission_file', {
      p_version_id: version,
      p_kind: FILE_KIND[f.id],
      p_object_key: key,
      p_size_bytes: file.size,
      p_sha256: await sha256Hex(file),
    });
    if (registerError) throw toApiError(registerError.message);
  }

  // 4) فحص الملفات على الخادم (توقيع PDF والحجم الفعلي) قبل قبولها
  const scan = await fetch('/api/submissions/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionId: version }),
  });
  if (!scan.ok) {
    const body = (await scan.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? 'تعذّر فحص الملفات المرفوعة', scan.status);
  }

  // 5) الإرسال (قفل النسخة)
  const { data: result, error: submitError } = await supabase.rpc('submit_version', {
    p_version_id: version,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (submitError) throw toApiError(submitError.message);

  return {
    submissionId: (result.submission_id as string) ?? submissionId,
    publicNo: (result.public_no as string) ?? publicNo,
    status: result.status as SubmitResult['status'],
  };
}
