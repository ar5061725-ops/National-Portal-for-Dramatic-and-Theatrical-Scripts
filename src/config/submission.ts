import type { PaymentMethodId, RequiredFileId, WorkType } from '@/types';
import type { IconName } from '@/components/ui/Icon';

export interface WorkTypeField {
  id: string;
  label: string;
  placeholder: string;
}

export interface WorkTypeConfig {
  id: WorkType;
  label: string;
  icon: IconName;
  detailsTitle: string;
  fields: [WorkTypeField, WorkTypeField];
  /** الحقل الذي يظهر كوصف لطول العمل + صيغة عرضه. */
  length: { fieldId: string; format: (value: string) => string };
}

export const WORK_TYPES: WorkTypeConfig[] = [
  {
    id: 'play',
    label: 'مسرحية',
    icon: 'theatre',
    detailsTitle: 'تفاصيل المسرحية',
    fields: [
      { id: 'duration', label: 'مدة العرض (دقيقة)', placeholder: '90' },
      { id: 'chapters', label: 'عدد الفصول', placeholder: '3' },
    ],
    length: { fieldId: 'chapters', format: (v) => `${v} فصول` },
  },
  {
    id: 'series',
    label: 'مسلسل درامي',
    icon: 'series',
    detailsTitle: 'تفاصيل المسلسل',
    fields: [
      { id: 'episodes', label: 'عدد الحلقات', placeholder: '30' },
      { id: 'episodeDuration', label: 'مدة الحلقة (دقيقة)', placeholder: '45' },
    ],
    length: { fieldId: 'episodes', format: (v) => `${v} حلقة` },
  },
  {
    id: 'film',
    label: 'فيلم سينمائي',
    icon: 'film',
    detailsTitle: 'تفاصيل الفيلم',
    fields: [
      { id: 'duration', label: 'مدة الفيلم (دقيقة)', placeholder: '110' },
      { id: 'scenes', label: 'عدد المشاهد', placeholder: '60' },
    ],
    length: { fieldId: 'duration', format: (v) => `${v} دقيقة` },
  },
];

export const GENRES = [
  { id: 'mystery', label: 'غموض' },
  { id: 'crime', label: 'جريمة' },
  { id: 'thriller', label: 'تشويق' },
  { id: 'psych', label: 'نفسي' },
  { id: 'mono', label: 'مونودراما' },
  { id: 'social', label: 'اجتماعي' },
] as const;

export const REQUIRED_FILES: { id: RequiredFileId; label: string }[] = [
  { id: 'exec', label: 'الملف التنفيذي' },
  { id: 'treatment', label: 'المعالجة الدرامية' },
  { id: 'author', label: 'ملف المؤلف' },
  { id: 'script', label: 'السيناريو والحوار' },
];

export const LOGLINE_MAX = 300;
export const MAX_PDF_MB = 20;

export const PAYMENT_METHODS: { id: PaymentMethodId; label: string; hint: string }[] = [
  { id: 'knet', label: 'كي نت', hint: 'الدفع ببطاقة البنك المحلية' },
  { id: 'card', label: 'بطاقة ائتمانية', hint: 'فيزا أو ماستركارد' },
  { id: 'apple', label: 'Apple Pay', hint: 'الدفع السريع من الآيفون' },
];

export function getWorkType(id: WorkType): WorkTypeConfig {
  return WORK_TYPES.find((t) => t.id === id) ?? WORK_TYPES[1];
}
