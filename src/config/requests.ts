import type { DecisionId, RequestStatus, Tone } from '@/types';

export const REQUEST_STEPS = ['تم الاستلام', 'قيد المراجعة', 'ملاحظات اللجنة', 'القرار'] as const;

/** الحالة تُكتب دائماً بجانب لونها (لا يُعتمد على اللون وحده). */
export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: Tone; color: string }> = {
  draft: { label: 'مسودة', tone: 'neutral', color: 'var(--muted-2)' },
  awaiting_payment: { label: 'بانتظار الدفع', tone: 'warning', color: 'var(--gold-dark)' },
  received: { label: 'مستلم', tone: 'info', color: 'var(--primary)' },
  review: { label: 'قيد المراجعة', tone: 'info', color: 'var(--primary)' },
  revision: { label: 'مطلوب تعديل', tone: 'warning', color: 'var(--warning)' },
  approved: { label: 'مجاز', tone: 'success', color: 'var(--success)' },
  rejected: { label: 'مرفوض', tone: 'danger', color: 'var(--danger)' },
};

export const DECISIONS: { id: DecisionId; label: string; tone: Tone }[] = [
  { id: 'approve', label: 'إجازة', tone: 'success' },
  { id: 'revise', label: 'طلب تعديل', tone: 'warning' },
  { id: 'reject', label: 'رفض', tone: 'danger' },
];

/**
 * معايير التقييم الموزونة (وثيقة آلية تقييم النصوص). كل معيار يُقيَّم من 0 إلى 10،
 * والمجموع من 100 = Σ(الدرجة × الوزن) ÷ 10. تُقرأ فعلياً من rubric_criteria في القاعدة؛
 * هذه نسخة العرض والمحاكاة وتطابق النسخة 1 المزروعة.
 */
export const REVIEW_CRITERIA = [
  { id: 'idea_originality', label: 'الفكرة والأصالة', weight: 15, hint: 'وضوح فرضية العمل وتميز زاويته وقدرته على توليد أحداث' },
  { id: 'dramatic_structure', label: 'البناء الدرامي', weight: 20, hint: 'ترابط الأحداث والتصعيد والسببية وتماسك البداية والنهاية' },
  { id: 'characters', label: 'الشخصيات وأقواسها', weight: 15, hint: 'الدوافع والتغير وتمايز الشخصيات وأثرها في الحبكة' },
  { id: 'dialogue', label: 'الحوار', weight: 10, hint: 'تميّز الأصوات ووظيفة الحوار وملاءمته للشخصيات والموقف' },
  { id: 'rhythm_suspense', label: 'الإيقاع والتشويق', weight: 15, hint: 'وظيفة المشاهد وتوزيع التحولات وإدارة التوتر' },
  { id: 'staging', label: 'التكوين المسرحي / البصري', weight: 10, hint: 'قوة الفعل الدرامي والفضاء المسرحي أو الصورة' },
  { id: 'world_genre', label: 'تماسك العالم وملاءمة النوع', weight: 10, hint: 'اتساق قواعد العالم واللغة والوعود التي يقدمها العمل لجمهوره' },
  { id: 'execution_maturity', label: 'النضج التنفيذي', weight: 5, hint: 'وضوح المواد التنفيذية واتساقها مع العمل ضمن نطاق التقييم' },
] as const;

/** سياسة الجولة (policy_config في rubric_versions). */
export const REVIEW_POLICY = { initialReviewers: 2, gapThreshold: 15, approveMin: 80, reviseMin: 65 } as const;

/** مرجع تفسير الدرجة لكل معيار. */
export const SCORE_BANDS = [
  { max: 2, label: 'ضعيف جداً' },
  { max: 4, label: 'ضعيف' },
  { max: 6, label: 'مقبول' },
  { max: 8, label: 'جيد' },
  { max: 10, label: 'ممتاز' },
] as const;
