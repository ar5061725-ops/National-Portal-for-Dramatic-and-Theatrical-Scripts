import { REVIEW_CRITERIA, REVIEW_POLICY, SCORE_BANDS } from '@/config/requests';
import type { CriterionScoreInput, DecisionId } from '@/types';

/** المجموع من 100 = Σ(الدرجة × الوزن) ÷ 10، ويطابق app_private.review_total في القاعدة. */
export function weightedTotal(scores: Record<string, Pick<CriterionScoreInput, 'score'>>): number {
  const sum = REVIEW_CRITERIA.reduce((acc, c) => acc + (scores[c.id]?.score ?? 0) * c.weight, 0);
  return Math.round(sum * 100) / 1000;
}

/** التوصية المقترحة تلقائياً بحسب العتبات (≥80 إجازة، 65–79.9 تعديل، دونها رفض). */
export function suggestedDecision(total: number): DecisionId {
  if (total >= REVIEW_POLICY.approveMin) return 'approve';
  if (total >= REVIEW_POLICY.reviseMin) return 'revise';
  return 'reject';
}

/** مقابلات الأنواع بين الواجهة (approve/revise/reject) والقاعدة (approved/revision_requested/rejected). */
export type DbOutcome = 'approved' | 'revision_requested' | 'rejected';
const TO_DB: Record<DecisionId, DbOutcome> = { approve: 'approved', revise: 'revision_requested', reject: 'rejected' };
export function toDbOutcome(id: DecisionId): DbOutcome {
  return TO_DB[id];
}
export function fromDbOutcome(value: string | null | undefined): DecisionId | null {
  return (Object.keys(TO_DB) as DecisionId[]).find((k) => TO_DB[k] === value) ?? null;
}

export function scoreBandLabel(score: number): string {
  return SCORE_BANDS.find((b) => score <= b.max)?.label ?? '';
}

/** هل يستلزم الفرق بين درجتي المراجعين تحكيماً (فرق ≥ العتبة أو اختلاف التوصية)؟ */
export function needsArbitration(a: { score: number; recommendation: DecisionId }, b: { score: number; recommendation: DecisionId }): boolean {
  return Math.abs(a.score - b.score) >= REVIEW_POLICY.gapThreshold || a.recommendation !== b.recommendation;
}
