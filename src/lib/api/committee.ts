import { REVIEW_CRITERIA } from '@/config/requests';
import { suggestedDecision, weightedTotal } from '@/lib/review';
import type {
  CommitteeOverview,
  ReviewSubmitInput,
  ReviewSubmitResult,
  RoundDecisionInput,
  RoundSummary,
} from '@/types';
import { ApiError, wait } from './client';

/** نسخ منزوعة الهوية: يظهر للمراجع رمز الطلب ونوع العمل فقط. */
const OVERVIEW: CommitteeOverview = {
  stats: { pending: 2, revised: 1, decided: 2 },
  queue: [
    { id: 'a', code: 'NSP-2026-0002', meta: 'مسلسل درامي · 15 حلقة' },
    { id: 'b', code: 'NSP-2026-0003', meta: 'مسلسل درامي · نسخة معدّلة' },
  ],
};

export async function getCommitteeOverview(): Promise<CommitteeOverview> {
  await wait();
  return OVERVIEW;
}

/** إقرار المراجع بعدم وجود تعارض مصالح (شرط لفتح الملفات ونموذج التقييم). */
export async function acknowledgeNoConflict(itemId: string): Promise<true> {
  await wait(400);
  if (!OVERVIEW.queue.some((q) => q.id === itemId)) throw new ApiError('التعيين غير موجود', 404);
  return true;
}

/** إعلان تعارض المصالح؛ يُسحب التعيين وتُعاد الإحالة لمراجع آخر. */
export async function declareConflict(itemId: string): Promise<void> {
  await wait(600);
  if (!OVERVIEW.queue.some((q) => q.id === itemId)) throw new ApiError('التعيين غير موجود', 404);
}

/** إرسال التقييم: مبرر لكل معيار إلزامي، وبعد الإرسال يُقفل التقييم (يطابق submit_review). */
export async function submitReview(input: ReviewSubmitInput): Promise<ReviewSubmitResult> {
  await wait(700);
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
  return { total: weightedTotal(input.scores) };
}

/** مثال جولة بانتظار القرار (وسيط ثلاثة تقييمات كما في الوثيقة). */
const ROUND: RoundSummary = {
  roundId: 'r1',
  code: 'NSP-2026-0002',
  status: 'awaiting_decision',
  aggregateScore: 76.5,
  recommended: suggestedDecision(76.5),
  reviews: [
    { label: 'مراجع 1', score: 76.5, recommendation: 'revise', isArbitration: false },
    { label: 'مراجع 2', score: 50, recommendation: 'reject', isArbitration: false },
    { label: 'مراجع 3 (تحكيم)', score: 80, recommendation: 'revise', isArbitration: true },
  ],
};

export async function getRoundSummary(): Promise<RoundSummary> {
  await wait();
  return ROUND;
}

/** اعتماد القرار (يسبق النشر): القرار المخالف للتوصية يلزمه مبرر داخلي. */
export async function recordRoundDecision(input: RoundDecisionInput): Promise<void> {
  await wait(700);
  if (input.authorReason.trim().length < 3) throw new ApiError('اكتب السبب الذي سيراه المؤلف', 422);
  if (input.outcome !== ROUND.recommended && input.internalReason.trim().length < 3) {
    throw new ApiError('القرار يخالف التوصية الآلية؛ اكتب المبرر الداخلي', 422);
  }
}

/** نشر النتيجة للمؤلف (لقطة غير قابلة للتعديل؛ التصحيح يكون بنسخة تصحيحية). */
export async function publishRoundResult(roundId: string): Promise<void> {
  await wait(800);
  if (roundId !== ROUND.roundId) throw new ApiError('الجولة غير موجودة', 404);
}
