import type { DecisionId, RequestStatus, Tone } from '@/types';

export const REQUEST_STEPS = ['تم الاستلام', 'قيد المراجعة', 'ملاحظات اللجنة', 'القرار'] as const;

export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: Tone; color: string }> = {
  revision: { label: 'مطلوب تعديل', tone: 'warning', color: 'var(--warning)' },
  review: { label: 'قيد المراجعة', tone: 'info', color: 'var(--primary)' },
  approved: { label: 'مجاز', tone: 'success', color: 'var(--success)' },
};

export const DECISIONS: { id: DecisionId; label: string; tone: Tone }[] = [
  { id: 'approve', label: 'إجازة', tone: 'success' },
  { id: 'revise', label: 'طلب تعديل', tone: 'warning' },
  { id: 'reject', label: 'رفض', tone: 'danger' },
];
