import type { Metadata } from 'next';
import { getPayableRequest } from '@/lib/api/requests';
import { PaymentFlow } from '@/features/payment/PaymentFlow';

export const metadata: Metadata = { title: 'بوابة الدفع' };

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const serverSummary = await getPayableRequest(id);
  return <PaymentFlow requestId={id} serverSummary={serverSummary} />;
}
