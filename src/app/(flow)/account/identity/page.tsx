import type { Metadata } from 'next';
import { IdentityCompletion } from '@/features/auth/IdentityCompletion';

export const metadata: Metadata = { title: 'استكمال بيانات الهوية' };

export default function IdentityPage() {
  return <IdentityCompletion />;
}
