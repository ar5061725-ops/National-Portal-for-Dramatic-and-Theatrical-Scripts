import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata: Metadata = { title: 'دخول أعضاء لجنة المراجعة' };

export default function CommitteeLoginPage() {
  return <LoginForm variant="committee" />;
}
