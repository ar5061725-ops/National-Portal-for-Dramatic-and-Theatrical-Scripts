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

export function scoreBandLabel(score: number): string {
  return SCORE_BANDS.find((b) => score <= b.max)?.label ?? '';
}

/** هل يستلزم الفرق بين درجتي المراجعين تحكيماً (فرق ≥ العتبة أو اختلاف التوصية)؟ */
export function needsArbitration(a: { score: number; recommendation: DecisionId }, b: { score: number; recommendation: DecisionId }): boolean {
  return Math.abs(a.score - b.score) >= REVIEW_POLICY.gapThreshold || a.recommendation !== b.recommendation;
}
