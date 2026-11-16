import { REVIEW_CRITERIA } from '@/config/requests';
import { toDbOutcome, weightedTotal } from '@/lib/review';
import { getSupabase } from '@/lib/supabase/client';
import type { ReviewSubmitInput, ReviewSubmitResult, RoundDecisionInput } from '@/types';
import { ApiError } from './client';

/** تغييرات اللجنة من المتصفح عبر RPC؛ الصلاحيات والقواعد تُفرض داخل القاعدة، والمتصفح لا يقرر شيئاً. */

const RPC_MESSAGES: Record<string, string> = {
  conflict_ack_required: 'أقرّ بعدم وجود تعارض مصالح أولاً',
  review_locked: 'أُرسل هذا التقييم وأُقفل ولا يُعدَّل',
  review_incomplete: 'أكمل درجات ومبررات المعايير الثمانية والتوصية',
  round_closed: 'أُغلقت هذه الجولة',
  round_not_ready: 'الجولة لم تكتمل بعد؛ يتاح القرار بعد اكتمال التقييمات أو التحكيم',
  conflict_of_interest: 'لا يجوز لك اتخاذ قرار في جولة شاركتَ فيها أو في عملك',
  already_published: 'نُشرت نتيجة هذا القرار سابقاً',
  decision_not_publishable: 'لا يمكن نشر هذه النتيجة في حالة الطلب الحالية',
  reviewer_limit_reached: 'اكتمل عدد المراجعين المسموح لهذه الجولة',
  self_review_forbidden: 'لا يمكن تعيين المؤلف مراجعاً لعمله',
  forbidden: 'ليست لديك صلاحية لهذا الإجراء',
  not_found: 'العنصر غير موجود أو لم يعد متاحاً',
  no_active_rubric: 'لا توجد نسخة معايير مفعّلة لهذا النوع',
  version_not_reviewable: 'هذه النسخة غير قابلة للمراجعة الآن',
  conflict_declared: 'سُجّل إعلان التعارض لهذا التعيين',
};

function toApiError(message: string): ApiError {
  const key = Object.keys(RPC_MESSAGES).find((k) => message.includes(k));
  if (message.includes('23505')) return new ApiError('هذا المراجع معيَّن مسبقاً لهذه الجولة', 409);
  return new ApiError(key ? RPC_MESSAGES[key] : 'تعذّر إكمال العملية، حاول مرة أخرى', 500);
}

/** إقرار المراجع بعدم وجود تعارض مصالح (شرط لفتح الملفات ونموذج التقييم). */
export async function acknowledgeNoConflict(assignmentId: string): Promise<true> {
  const { error } = await getSupabase().rpc('acknowledge_no_conflict', { p_assignment_id: assignmentId });
  if (error) throw toApiError(error.message);
  return true;
}

/** إعلان تعارض المصالح؛ يُسحب التعيين وتُسجَّل الواقعة في التدقيق. */
export async function declareConflict(assignmentId: string): Promise<void> {
  const { error } = await getSupabase().rpc('declare_review_conflict', { p_assignment_id: assignmentId, p_reason: 'تعارض مصالح معلَن من المراجع' });
  if (error) throw toApiError(error.message);
}

/** حفظ التقييم ثم إرساله وقفله (save_review ثم submit_review). المجموع والقرار يحسبهما الخادم. */
export async function submitReview(input: ReviewSubmitInput): Promise<ReviewSubmitResult> {
  for (const c of REVIEW_CRITERIA) {
    const s = input.scores[c.id];
    if (!s || s.score < 0 || s.score > 10) throw new ApiError(`درجة «${c.label}» يجب أن تكون بين 0 و10`, 422);
    if (s.rationale.trim().length < 3) throw new ApiError(`اكتب مبرراً لمعيار «${c.label}»`, 422);
  }
  for (const n of input.notes) {
    if (n.requiresRevision && !(n.requiredAction?.trim() && n.completionCriterion?.trim())) {
      throw new ApiError('الملاحظة التي تستلزم تعديلاً تحتاج إجراءً مطلوباً ومعيار إنجاز', 422);
    }
  }
  const supabase = getSupabase();
  const { error: saveError } = await supabase.rpc('save_review', {
    p_assignment_id: input.itemId,
    p_scores: REVIEW_CRITERIA.map((c) => ({ criterion_key: c.id, score: input.scores[c.id].score, rationale: input.scores[c.id].rationale.trim(), locator: input.scores[c.id].locator.trim() })),
    p_recommendation: input.recommendation,
    p_notes: input.notes.map((n) => ({
      locator: n.locator,
      body: n.body,
      proposed_for_author: Boolean(n.proposedForAuthor),
      requires_revision: Boolean(n.requiresRevision),
      required_action: n.requiredAction ?? null,
      completion_criterion: n.completionCriterion ?? null,
    })),
  });
  if (saveError) throw toApiError(saveError.message);

  const { data, error } = await supabase.rpc('submit_review', { p_assignment_id: input.itemId });
  if (error) throw toApiError(error.message);
  const total = Number((data as { score?: number } | null)?.score ?? weightedTotal(input.scores));
  return { total };
}

/** تعيين مراجع على نسخة مختومة (مشرف فقط). */
export async function assignReviewer(versionId: string, reviewerId: string): Promise<true> {
  const { error } = await getSupabase().rpc('assign_review', { p_version_id: versionId, p_reviewer_id: reviewerId });
  if (error) throw toApiError(error.message);
  return true;
}

/** اعتماد القرار (يسبق النشر): القرار المخالف للتوصية الآلية يلزمه مبرر داخلي. */
export async function recordRoundDecision(input: RoundDecisionInput): Promise<string> {
  if (input.authorReason.trim().length < 3) throw new ApiError('اكتب السبب الذي سيراه المؤلف', 422);
  const { data, error } = await getSupabase().rpc('record_decision', {
    p_round_id: input.roundId,
    p_outcome: toDbOutcome(input.outcome),
    p_author_reason: input.authorReason.trim(),
    p_internal_reason: input.internalReason.trim() || null,
  });
  if (error) {
    if (error.message.includes('decision_internal_reason_when_differs')) throw new ApiError('القرار يخالف التوصية الآلية؛ اكتب المبرر الداخلي', 422);
    throw toApiError(error.message);
  }
  return data as string;
}

/** نشر النتيجة للمؤلف (لقطة غير قابلة للتعديل، وتُنشأ الشهادة عند الإجازة). */
export async function publishRoundResult(decisionId: string): Promise<void> {
  const { error } = await getSupabase().rpc('publish_review_result', { p_decision_id: decisionId, p_idempotency_key: crypto.randomUUID() });
  if (error) throw toApiError(error.message);
}
