import type { Metadata } from 'next';
import { verifyCertificate } from '@/lib/api/scripts';
import { VerifyScreen } from '@/features/verify/VerifyScreen';

export const metadata: Metadata = { title: 'التحقق من الشهادة' };

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const result = await verifyCertificate(decoded);
  return <VerifyScreen code={decoded} result={result} />;
}
