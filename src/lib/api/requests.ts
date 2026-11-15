import type { FeedbackThread, PayableRequest, ScriptRequest } from '@/types';
import { ApiError, wait } from './client';

const REQUESTS: ScriptRequest[] = [
  {
    id: 'req-5',
    title: 'صدى الميناء',
    meta: 'مسلسل درامي · 20 حلقة',
    status: 'draft',
    step: 0,
    no: 'مسودة غير مرسلة',
  },
  {
    id: 'NSP-2026-0004',
    title: 'ليالي المباركية',
    meta: 'نص مسرحي · 3 فصول',
    status: 'awaiting_payment',
    step: 0,
    no: 'NSP-2026-0004',
  },
  {
    id: 'req-1',
    title: 'رسائل من الماضي',
    meta: 'مسلسل درامي · تشويق، نفسي',
    status: 'revision',
    step: 3,
    no: 'NSP-2026-0003',
    reason: 'النص واعد، وتحتاج بعض المشاهد إلى تمهيد أوضح قبل الإجازة (انظر الملاحظات).',
  },
  {
    id: 'req-2',
    title: 'ظل النخلة',
    meta: 'مسلسل درامي · 15 حلقة',
    status: 'review',
    step: 2,
    no: 'NSP-2026-0002',
  },
  {
    id: 'req-3',
    title: 'بيت على البحر',
    meta: 'مسلسل درامي · 30 حلقة',
    status: 'approved',
    step: 4,
    no: 'NSP-2026-0001',
    scriptId: 'bayt-ala-albahr',
  },
  {
    id: 'req-6',
    title: 'جدار الصمت',
    meta: 'نص مسرحي · فصلان',
    status: 'rejected',
    step: 4,
    no: 'NSP-2025-0099',
    reason: 'لم يستوفِ النص شرط الأصالة؛ فهو قريب جداً من عملٍ منشور سابقاً. يمكنك تقديم نصٍّ جديد.',
  },
];

const FEEDBACK: Record<string, FeedbackThread['notes']> = {
  'req-1': [
    {
      no: 1,
      where: 'المشهد 12',
      text: 'الانتقال إلى الماضي سريع ويحتاج تمهيداً أوضح حتى لا يرتبك المشاهد.',
    },
    {
      no: 2,
      where: 'شخصية سارة',
      text: 'دوافعها في الفصل الثاني غير مقنعة، يُقترح إضافة مشهد يوضح علاقتها بوالدها.',
    },
    {
      no: 3,
      where: 'الحوار العام',
      text: 'بعض الجمل الحوارية طويلة، يُفضّل اختصارها لتناسب الإيقاع السينمائي.',
    },
  ],
};

/** الطلبات التي تنتظر الدفع (لعرض ملخصها في بوابة الدفع). */
const PAYABLE: Record<string, PayableRequest> = {
  'NSP-2026-0004': {
    id: 'NSP-2026-0004',
    title: 'ليالي المباركية',
    workDescription: 'نص مسرحي · 3 فصول',
    filesCount: 4,
  },
};

export async function getMyRequests(): Promise<ScriptRequest[]> {
  await wait();
  return REQUESTS;
}

/** تفاصيل الطلب مع ملاحظات اللجنة (إن وُجدت). */
export async function getRequestDetail(id: string): Promise<FeedbackThread | null> {
  await wait();
  const request = REQUESTS.find((r) => r.id === id);
  if (!request) return null;
  return { request: { ...request, kind: request.meta.split(' · ')[0] }, notes: FEEDBACK[id] ?? [] };
}

export async function getPayableRequest(id: string): Promise<PayableRequest | null> {
  await wait(150);
  return PAYABLE[id] ?? null;
}

export interface RevisionInput {
  reply: string;
  fileName?: string;
}

export async function submitRevision(requestId: string, input: RevisionInput): Promise<void> {
  await wait(800);
  if (!REQUESTS.some((r) => r.id === requestId && r.status === 'revision')) {
    throw new ApiError('لا يمكن إرسال نسخة معدلة لهذا الطلب', 409);
  }
  if (!input.reply.trim() && !input.fileName) {
    throw new ApiError('أرفق النسخة المعدّلة أو اكتب ردك على اللجنة', 422);
  }
}
