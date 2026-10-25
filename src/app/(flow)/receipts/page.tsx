import type { Metadata } from 'next';
import { getReceipts } from '@/lib/api/receipts';
import { ReceiptsScreen } from '@/features/receipts/ReceiptsScreen';

export const metadata: Metadata = { title: 'الإيصالات والمدفوعات' };

export default async function ReceiptsPage() {
  const { receipts, totalLabel } = await getReceipts();
  return <ReceiptsScreen receipts={receipts} totalLabel={totalLabel} />;
}
