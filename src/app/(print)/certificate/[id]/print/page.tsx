import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCertificate } from '@/lib/api/scripts';
import { PrintableCertificate } from '@/features/certificate/PrintableCertificate';

export const metadata: Metadata = { title: 'طباعة الشهادة' };

export default async function PrintCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const certificate = await getCertificate(id);
  if (!certificate) notFound();
  return <PrintableCertificate certificate={certificate} />;
}
