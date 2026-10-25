import type { Metadata } from 'next';
import { TermsScreen } from '@/features/terms/TermsScreen';

export const metadata: Metadata = { title: 'الشروط والإرشادات' };

export default function TermsPage() {
  return <TermsScreen />;
}
