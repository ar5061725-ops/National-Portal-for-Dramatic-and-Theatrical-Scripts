import type { Metadata } from 'next';
import { SupportScreen } from '@/features/support/SupportScreen';

export const metadata: Metadata = { title: 'الدعم' };

export default function SupportPage() {
  return <SupportScreen />;
}
