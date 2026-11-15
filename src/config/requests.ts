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

/** معايير تقييم المراجع (تُحفظ في criteria_scores، والدرجة النهائية متوسطها من ١ إلى ١٠). */
export const REVIEW_CRITERIA = [
  { id: 'structure', label: 'البناء الدرامي' },
  { id: 'characters', label: 'الشخصيات' },
  { id: 'dialogue', label: 'الحوار' },
  { id: 'originality', label: 'الأصالة' },
] as const;
