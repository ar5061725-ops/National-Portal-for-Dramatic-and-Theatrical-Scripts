import type { Metadata } from 'next';
import { PaymentFlow } from '@/features/payment/PaymentFlow';

export const metadata: Metadata = { title: 'بوابة الدفع' };

export default function PaymentPage() {
  return <PaymentFlow />;
}
