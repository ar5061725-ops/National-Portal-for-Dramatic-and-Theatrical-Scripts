import { WORK_TYPES } from '@/config/submission';
import { getServerSupabase } from '@/lib/supabase/server';
import type { FeedbackThread, PaidResult, PayableRequest, RequestStatus, ScriptRequest } from '@/types';
import { ApiError } from './client';

/** قراءات الطلبات من Supabase لمكوّنات الخادم. RLS تضمن أن المؤلف لا يرى إلا طلباته. */

const STATUS_MAP: Record<string, RequestStatus> = {
  draft: 'draft',
  awaiting_payment: 'awaiting_payment',
  received: 'received',
  in_review: 'review',
  revision_requested: 'revision',
  approved: 'approved',
  rejected: 'rejected',
};

const STEP: Record<RequestStatus, number> = {
  draft: 0,
  awaiting_payment: 0,
  received: 1,
  review: 2,
  revision: 3,
  approved: 4,
  rejected: 4,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface VersionRow {
  id: string;
  title: string;
  work_type: 'play' | 'series' | 'film';
  episodes_count: number | null;
  acts_count: number | null;
  duration_minutes: number | null;
}

interface SubmissionRow {
  id: string;
  public_no: string;
  status: string;
  current_version_id: string | null;
}

interface PublishedResult {
  author_reason?: string;
  notes?: { locator: string; body: string; required_action?: string | null; completion_criterion?: string | null }[];
}

function workLabel(v: VersionRow | undefined): { kind: string; meta: string } {
  const type = WORK_TYPES.find((t) => t.id === v?.work_type);
  const kind = type?.label ?? 'عمل';
  if (!v) return { kind, meta: kind };
  const length =
    v.work_type === 'series' && v.episodes_count
      ? `${v.episodes_count} حلقة`
      : v.work_type === 'play' && v.acts_count
        ? `${v.acts_count} فصول`
        : v.duration_minutes
          ? `${v.duration_minutes} دقيقة`
          : '';
  return { kind, meta: length ? `${kind} · ${length}` : kind };
}

async function currentUserId() {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new ApiError('يلزم تسجيل الدخول', 401);
  return { supabase, userId: data.user.id };
}

async function publishedResult(supabase: Awaited<ReturnType<typeof getServerSupabase>>, submissionId: string): Promise<PublishedResult | null> {
  const { data } = await supabase.rpc('get_published_result', { p_submission_id: submissionId });
  return (data as PublishedResult | null) ?? null;
}

export async function getMyRequests(): Promise<ScriptRequest[]> {
  const { supabase, userId } = await currentUserId();
  const { data: subs, error } = await supabase
    .from('submissions')
    .select('id, public_no, status, current_version_id')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new ApiError('تعذّر تحميل طلباتك', 500);
  const rows = (subs ?? []) as SubmissionRow[];
  if (rows.length === 0) return [];

  const versionIds = rows.map((r) => r.current_version_id).filter((v): v is string => Boolean(v));
  const { data: versions } = await supabase
    .from('submission_versions')
    .select('id, title, work_type, episodes_count, acts_count, duration_minutes')
    .in('id', versionIds);
  const byId = new Map(((versions ?? []) as VersionRow[]).map((v) => [v.id, v]));

  return Promise.all(
    rows.map(async (row): Promise<ScriptRequest> => {
      const status = STATUS_MAP[row.status] ?? 'received';
      const version = row.current_version_id ? byId.get(row.current_version_id) : undefined;
      const result = status === 'revision' || status === 'rejected' ? await publishedResult(supabase, row.id) : null;
      return {
        id: row.id,
        title: version?.title?.trim() || 'بدون عنوان',
        meta: workLabel(version).meta,
        status,
        step: STEP[status],
        no: status === 'draft' ? 'مسودة غير مرسلة' : row.public_no,
        reason: result?.author_reason,
      };
    }),
  );
}

/** تفاصيل الطلب مع ملاحظات اللجنة المنشورة للمؤلف فقط (لا تظهر قبل نشر النتيجة). */
export async function getRequestDetail(id: string): Promise<FeedbackThread | null> {
  if (!UUID.test(id)) return null;
  const { supabase, userId } = await currentUserId();
  const { data: sub } = await supabase
    .from('submissions')
    .select('id, public_no, status, current_version_id')
    .eq('id', id)
    .eq('author_id', userId)
    .maybeSingle();
  if (!sub) return null;
  const row = sub as SubmissionRow;

  const { data: version } = row.current_version_id
    ? await supabase
        .from('submission_versions')
        .select('id, title, work_type, episodes_count, acts_count, duration_minutes')
        .eq('id', row.current_version_id)
        .maybeSingle()
    : { data: null };
  const v = (version as VersionRow | null) ?? undefined;
  const status = STATUS_MAP[row.status] ?? 'received';
  const result = await publishedResult(supabase, row.id);
  const label = workLabel(v);

  return {
    request: {
      id: row.id,
      title: v?.title?.trim() || 'بدون عنوان',
      meta: label.meta,
      status,
      step: STEP[status],
      no: status === 'draft' ? 'مسودة غير مرسلة' : row.public_no,
      reason: result?.author_reason,
      kind: label.kind,
    },
    notes: (result?.notes ?? []).map((n, i) => ({
      no: i + 1,
      where: n.locator,
      text: n.required_action ? `${n.body} — المطلوب: ${n.required_action}${n.completion_criterion ? ` (الإنجاز: ${n.completion_criterion})` : ''}` : n.body,
    })),
  };
}

/** ملخص الطلب لبوابة الدفع (المعرّف هو رقم الطلب العام NSP-…). */
export async function getPayableRequest(publicNo: string): Promise<PayableRequest | null> {
  const { supabase, userId } = await currentUserId();
  const { data: sub } = await supabase
    .from('submissions')
    .select('id, public_no, status, current_version_id')
    .eq('public_no', publicNo)
    .eq('author_id', userId)
    .eq('status', 'awaiting_payment')
    .maybeSingle();
  if (!sub) return null;
  const row = sub as SubmissionRow;
  const { data: version } = await supabase
    .from('submission_versions')
    .select('id, title, work_type, episodes_count, acts_count, duration_minutes')
    .eq('id', row.current_version_id)
    .maybeSingle();
  const { count } = await supabase.from('submission_files').select('id', { count: 'exact', head: true }).eq('version_id', row.current_version_id);
  const { data: fee } = await supabase.rpc('get_current_fee');
  const v = (version as VersionRow | null) ?? undefined;
  return {
    id: row.public_no,
    submissionId: row.id,
    title: v?.title ?? '',
    workDescription: workLabel(v).meta,
    filesCount: count ?? 4,
    feeMinor: (fee as { amount_minor: number | null } | null)?.amount_minor ?? null,
  };
}

/** هل دُفع رسم هذا الطلب؟ يعيد رقم الإيصال إن وُجد (الحالة من القاعدة بعد تثبيت الدفع). */
export async function getPaidResult(publicNo: string): Promise<PaidResult | null> {
  const { supabase, userId } = await currentUserId();
  const { data: sub } = await supabase.from('submissions').select('id, public_no, status').eq('public_no', publicNo).eq('author_id', userId).maybeSingle();
  if (!sub || sub.status === 'awaiting_payment' || sub.status === 'draft') return null;
  const { data } = await supabase.rpc('get_payment_status', { p_submission_id: sub.id });
  const status = data as { state?: string; receipt_no?: string | null } | null;
  if (status?.state !== 'paid') return null;
  return { publicNo: sub.public_no, receiptNo: status.receipt_no ?? null };
}
