import type { FeedbackThread, ScriptRequest } from '@/types';
import { ApiError, wait } from './client';

const REQUESTS: ScriptRequest[] = [
  {
    id: 'req-1',
    title: 'رسائل من الماضي',
    meta: 'فيلم سينمائي · تشويق، نفسي',
    status: 'revision',
    step: 3,
    no: 'NSP-2026-0003',
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
];

const FEEDBACK: Record<string, FeedbackThread> = {
  'req-1': {
    request: { id: 'req-1', title: 'رسائل من الماضي', kind: 'فيلم سينمائي' },
    notes: [
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
  },
};

export async function getMyRequests(): Promise<ScriptRequest[]> {
  await wait();
  return REQUESTS;
}

export async function getFeedbackThread(requestId: string): Promise<FeedbackThread | null> {
  await wait();
  return FEEDBACK[requestId] ?? null;
}

export interface RevisionInput {
  reply: string;
  fileName?: string;
}

export async function submitRevision(requestId: string, input: RevisionInput): Promise<void> {
  await wait(800);
  if (!FEEDBACK[requestId]) throw new ApiError('الطلب غير موجود', 404);
  if (!input.reply.trim() && !input.fileName) {
    throw new ApiError('أرفق النسخة المعدّلة أو اكتب ردك على اللجنة', 422);
  }
}
