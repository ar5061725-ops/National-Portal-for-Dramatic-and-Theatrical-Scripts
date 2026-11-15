import { ApiError } from './client';

export interface RevisionInput {
  reply: string;
  fileName?: string;
}

/**
 * إرسال نسخة معدّلة. غير موصول بعد: يتطلب رفع النسخة الجديدة ثم استدعاء submit_revision،
 * فنرفض صراحةً بدل إظهار نجاح وهمي.
 */
export async function submitRevision(_requestId: string, input: RevisionInput): Promise<void> {
  if (!input.reply.trim() && !input.fileName) {
    throw new ApiError('أرفق النسخة المعدّلة أو اكتب ردك على اللجنة', 422);
  }
  throw new ApiError('إرسال النسخة المعدّلة سيتاح قريباً', 501);
}
