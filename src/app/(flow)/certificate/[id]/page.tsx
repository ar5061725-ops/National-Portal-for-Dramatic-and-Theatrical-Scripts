import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCertificate } from '@/lib/api/scripts';
import { CertificateView } from '@/features/certificate/CertificateView';

export const metadata: Metadata = { title: 'شهادة الإجازة' };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const certificate = await getCertificate(id);
  if (!certificate) notFound();
  return <CertificateView certificate={certificate} />;
}
