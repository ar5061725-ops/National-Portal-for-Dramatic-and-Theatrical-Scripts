'use client';

import { ROUTES } from '@/config/routes';
import { MESSAGES, SHARE, SITE } from '@/config/site';
import { scoreText } from '@/lib/text';
import { useToast } from '@/providers/ToastProvider';
import type { Certificate } from '@/types';
import { QrCode } from '@/components/ui/QrCode';
import { BackButton } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import styles from './CertificateView.module.css';

function Field({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <b className={accent ? styles.accent : undefined}>{children}</b>
    </div>
  );
}

interface CertificateViewProps {
  certificate: Certificate;
  /** رمز QR (SVG) يشير إلى رابط التحقق العام */
  qrSvg: string;
  verifyUrl: string;
}

export function CertificateView({ certificate, qrSvg, verifyUrl }: CertificateViewProps) {
  const { showToast } = useToast();

  async function handleShare() {
    // نشارك رابط التحقق العام لا صفحة الشهادة الخاصة بالمؤلف
    const url = verifyUrl;
    try {
      if (navigator.share) {
        await navigator.share({ ...SHARE, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast(MESSAGES.shareLinkCopied);
    } catch (error) {
      // إلغاء المستخدم لنافذة المشاركة ليس خطأ
      if (error instanceof DOMException && error.name === 'AbortError') return;
      showToast(MESSAGES.genericError);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <BackButton href={ROUTES.submissions} />
        <h1 className={styles.barTitle}>شهادة الإجازة</h1>
        <span className={styles.spacer} />
      </div>

      <main className={styles.sheetWrap}>
        <article className={styles.sheet}>
          <div className={styles.frame}>
            <Logo size={64} bordered={false} />
            <p className={styles.country}>
              {SITE.country} · {SITE.ministry}
            </p>
            <h2 className={styles.heading}>شهادة إجازة نص</h2>
            <span className={styles.rule} aria-hidden="true" />
            <p className={styles.statement}>شهادة تجريبية في نموذج البوابة المقترحة لإجازة النص (ليست رسمية)</p>
            <p className={styles.title}>{certificate.title}</p>

            <div className={styles.fields}>
              <Field label="المؤلف">{certificate.author}</Field>
              <Field label="النوع">
                {certificate.workTypeLabel} · {certificate.lengthValue}
              </Field>
              <Field label="رقم الإجازة">{certificate.licenseNo}</Field>
              <Field label="تاريخ الإجازة">{certificate.licenseDate}</Field>
              <Field label="رقم المصنف (المكتبة الوطنية)">
                <span dir="ltr">{certificate.workNo}</span>
              </Field>
              <Field label="حقوق الملكية" accent>
                محفوظة للمؤلف
              </Field>
            </div>

            <div className={styles.footer}>
              <div className={styles.score}>
                <span className={styles.fieldLabel}>التقييم</span>
                <span dir="ltr" className={styles.scoreValue}>
                  {scoreText(certificate.score)}
                </span>
              </div>
              <div className={styles.verify}>
                <QrCode svg={qrSvg} size={92} label="رمز QR للتحقق من الشهادة" />
                <span className={styles.fieldLabel}>رمز التحقق</span>
                <b dir="ltr" className={styles.code}>
                  {certificate.verifyCode}
                </b>
              </div>
            </div>
          </div>
        </article>
      </main>

      <div className={styles.actions}>
        <ButtonLink href={ROUTES.certificatePrint(certificate.scriptId)} variant="gold" size="md">
          <Icon name="print" size={18} strokeWidth={2} />
          طباعة
        </ButtonLink>
        <Button variant="white" size="md" onClick={() => showToast(MESSAGES.certificateDownloaded)}>
          <Icon name="download" size={18} strokeWidth={2} />
          تحميل PDF
        </Button>
        <Button variant="glass" size="md" onClick={() => void handleShare()}>
          <Icon name="share" size={18} strokeWidth={2} />
          مشاركة
        </Button>
      </div>
    </div>
  );
}
