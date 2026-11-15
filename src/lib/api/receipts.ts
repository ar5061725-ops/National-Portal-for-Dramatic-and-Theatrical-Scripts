import { PLACEHOLDERS } from '@/config/site';
import type { Receipt } from '@/types';
import { wait } from './client';

const RECEIPTS: Receipt[] = [
  { id: 'r1', title: 'رسائل من الماضي', method: 'كي نت', status: 'paid' },
  { id: 'r2', title: 'ظل النخلة', method: 'كي نت', status: 'paid' },
  { id: 'r3', title: 'بيت على البحر', method: 'كي نت', status: 'partially_refunded' },
].map((r) => ({ ...r, dateLabel: PLACEHOLDERS.date, amountLabel: PLACEHOLDERS.fee }) as Receipt);

export async function getReceipts(): Promise<{ receipts: Receipt[]; totalLabel: string }> {
  await wait();
  return { receipts: RECEIPTS, totalLabel: PLACEHOLDERS.totalFees };
}
