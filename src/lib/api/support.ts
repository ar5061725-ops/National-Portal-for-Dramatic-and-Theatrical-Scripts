import type { SupportTicketInput } from '@/types';
import { ApiError, wait } from './client';

/** رفع تذكرة دعم برقم الطلب وبحسب نوع الطلب. يعيد رقم التذكرة. */
export async function submitSupportTicket(input: SupportTicketInput): Promise<{ ticketNo: string }> {
  await wait(900);
  if (input.message.trim().length < 10) throw new ApiError('اشرح مشكلتك في جملة أو جملتين على الأقل', 422);
  return { ticketNo: `SUP-${String(Date.now()).slice(-5)}` };
}
