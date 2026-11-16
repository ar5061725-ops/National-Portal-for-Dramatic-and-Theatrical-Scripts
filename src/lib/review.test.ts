import { describe, expect, it } from 'vitest';
import { needsArbitration, scoreBandLabel, suggestedDecision, weightedTotal } from './review';

const scoresOf = (values: number[]) =>
  Object.fromEntries(
    ['idea_originality', 'dramatic_structure', 'characters', 'dialogue', 'rhythm_suspense', 'staging', 'world_genre', 'execution_maturity'].map((k, i) => [k, { score: values[i] }]),
  );

describe('weightedTotal', () => {
  it('يطابق مثال الوثيقة (76.5)', () => {
    expect(weightedTotal(scoresOf([8, 8, 7, 7, 8, 8, 7, 8]))).toBe(76.5);
  });
  it('كل المعايير 10 = 100، وكلها 0 = 0', () => {
    expect(weightedTotal(scoresOf(Array(8).fill(10)))).toBe(100);
    expect(weightedTotal(scoresOf(Array(8).fill(0)))).toBe(0);
  });
});

describe('suggestedDecision', () => {
  it('حدود العتبات 80 و65', () => {
    expect(suggestedDecision(80)).toBe('approve');
    expect(suggestedDecision(79.9)).toBe('revise');
    expect(suggestedDecision(65)).toBe('revise');
    expect(suggestedDecision(64.9)).toBe('reject');
  });
});

describe('needsArbitration', () => {
  it('فرق 15 درجة أو اختلاف التوصية يفتح التحكيم', () => {
    expect(needsArbitration({ score: 80, recommendation: 'approve' }, { score: 65, recommendation: 'approve' })).toBe(true);
    expect(needsArbitration({ score: 80, recommendation: 'approve' }, { score: 70, recommendation: 'revise' })).toBe(true);
    expect(needsArbitration({ score: 80, recommendation: 'approve' }, { score: 70, recommendation: 'approve' })).toBe(false);
  });
});

describe('scoreBandLabel', () => {
  it('يفسّر الدرجة بنطاقها', () => {
    expect(scoreBandLabel(2)).toBe('ضعيف جداً');
    expect(scoreBandLabel(10)).toBe('ممتاز');
  });
});
