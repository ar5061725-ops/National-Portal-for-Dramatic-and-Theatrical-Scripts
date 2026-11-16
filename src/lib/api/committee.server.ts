import { WORK_TYPES } from '@/config/submission';
import { fromDbOutcome } from '@/lib/review';
import { getServerSupabase } from '@/lib/supabase/server';
import type {
  AssignableSubmission,
  CommitteeOverview,
  DecisionId,
  ReviewerOption,
  RoundListItem,
  RoundReviewSummary,
  RoundStatus,
  RoundSummary,
} from '@/types';
import { ApiError } from './client';

/** قراءات اللجنة لمكوّنات الخادم، عبر دوال RPC تتحقق من الدور داخل القاعدة (مراجع أو مشرف). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function workMeta(row: { work_type: 'play' | 'series' | 'film'; episodes_count?: number | null; acts_count?: number | null; duration_minutes?: number | null }): string {
  const kind = WORK_TYPES.find((t) => t.id === row.work_type)?.label ?? 'عمل';
  const length = row.episodes_count ? `${row.episodes_count} حلقة` : row.acts_count ? `${row.acts_count} فصول` : row.duration_minutes ? `${row.duration_minutes} دقيقة` : '';
  return length ? `${kind} · ${length}` : kind;
}

async function client() {
  return getServerSupabase();
}

export async function getCommitteeOverview(): Promise<CommitteeOverview> {
  const supabase = await client();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new ApiError('يلزم تسجيل الدخول', 401);

  const [{ data: queue, error }, { count: completed }, { data: roles }] = await Promise.all([
    supabase.rpc('get_review_queue'),
    supabase.from('review_assignments').select('id', { count: 'exact', head: true }).eq('reviewer_id', auth.user.id).eq('status', 'completed'),
    supabase.from('user_roles').select('role').eq('user_id', auth.user.id).is('revoked_at', null),
  ]);
  if (error) throw new ApiError('تعذّر تحميل قائمة المراجعة', 500);

  type Row = {
    assignment_id: string;
    public_no: string;
    work_type: 'play' | 'series' | 'film';
    episodes_count: number | null;
    acts_count: number | null;
    duration_minutes: number | null;
    acknowledged: boolean;
    is_arbitration: boolean;
  };
  const rows = (queue ?? []) as Row[];
  return {
    stats: { pending: rows.length, arbitration: rows.filter((r) => r.is_arbitration).length, completed: completed ?? 0 },
    queue: rows.map((r) => ({
      id: r.assignment_id,
      code: r.public_no,
      meta: `${workMeta(r)}${r.is_arbitration ? ' · تحكيم' : ''}`,
      acknowledged: r.acknowledged,
      isArbitration: r.is_arbitration,
    })),
    isManager: (roles ?? []).some((r) => r.role === 'committee_manager'),
  };
}

export async function getManagerRounds(): Promise<RoundListItem[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('get_manager_rounds');
  if (error) throw new ApiError('تعذّر تحميل الجولات', 500);
  return ((data ?? []) as { round_id: string; public_no: string; status: RoundStatus; submitted_count: number; aggregate_score: number | null }[]).map((r) => ({
    roundId: r.round_id,
    code: r.public_no,
    status: r.status,
    submittedCount: r.submitted_count,
    aggregateScore: r.aggregate_score === null ? null : Number(r.aggregate_score),
  }));
}

export async function getRoundSummary(roundId: string): Promise<RoundSummary | null> {
  if (!UUID.test(roundId)) return null;
  const supabase = await client();
  const { data, error } = await supabase.rpc('get_round_summary', { p_round_id: roundId });
  if (error || !data) return null;
  const d = data as {
    round_id: string;
    public_no: string;
    status: RoundStatus;
    aggregate_score: number | null;
    recommended_outcome: string | null;
    decision_id: string | null;
    reviews: { label: string; score: number | null; recommendation: DecisionId | null; is_arbitration: boolean; submitted: boolean; conflict_declared: boolean }[];
  };
  const reviews: RoundReviewSummary[] = d.reviews.map((r) => ({
    label: r.label,
    score: r.score === null ? null : Number(r.score),
    recommendation: r.recommendation,
    isArbitration: r.is_arbitration,
    submitted: r.submitted,
    conflictDeclared: r.conflict_declared,
  }));
  return {
    roundId: d.round_id,
    code: d.public_no,
    status: d.status,
    aggregateScore: d.aggregate_score === null ? null : Number(d.aggregate_score),
    recommended: fromDbOutcome(d.recommended_outcome),
    decisionId: d.decision_id,
    reviews,
  };
}

export async function getAssignableSubmissions(): Promise<AssignableSubmission[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('get_assignable_submissions');
  if (error) throw new ApiError('تعذّر تحميل الطلبات المنتظرة', 500);
  type Row = { version_id: string; public_no: string; work_type: 'play' | 'series' | 'film'; assigned_count: number; round_status: RoundStatus | null };
  return ((data ?? []) as Row[]).map((r) => ({
    versionId: r.version_id,
    code: r.public_no,
    meta: workMeta(r),
    assignedCount: r.assigned_count,
    roundStatus: r.round_status,
  }));
}

export async function getReviewers(): Promise<ReviewerOption[]> {
  const supabase = await client();
  const { data } = await supabase.rpc('get_reviewers');
  return ((data ?? []) as { reviewer_id: string; full_name: string }[]).map((r) => ({ id: r.reviewer_id, name: r.full_name }));
}
