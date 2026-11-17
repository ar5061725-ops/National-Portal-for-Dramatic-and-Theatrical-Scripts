import { ROUTES } from '@/config/routes';
import type { CertificateVerification } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { StatePanel } from '@/components/ui/StatePanel';
import styles from './VerifyScreen.module.css';

interface VerifyScreenProps {
  code: string;
  result: CertificateVerification | null;
}

/** التحقق العام من شهادة: يعرض حالتها والحقول المصرّح بإظهارها فقط. */
export function VerifyScreen({ code, result }: VerifyScreenProps) {
  return (
    <>
      <PageHeader
        rounded
        start={<BackButton href={ROUTES.home} />}
        end={<Logo size={44} />}
        title="التحقق من الشهادة"
        titleSize={24}
        subtitle="للجميع: تحقق من رقم الإجازة بالبيانات المعتمدة للنشر"
      />

      <PageBody>
        {!result ? (
          <StatePanel
            tone="danger"
            icon="alert"
            title="رمز التحقق غير صحيح"
            description={`لم نجد شهادة بالرمز «${code}». تأكد من الرمز أو امسح رمز QR الموجود على الشهادة مرة أخرى.`}
          >
            <ButtonLink href={ROUTES.support} size="md" variant="outline">
              تواصل مع الدعم
            </ButtonLink>
          </StatePanel>
        ) : (
          <>
            <Card padding={20} radius={22}>
              <div className={styles.status} data-status={result.status}>
                <span className={styles.statusIcon}>
                  <Icon name={result.status === 'active' ? 'shield' : 'alert'} size={30} strokeWidth={2} />
                </span>
                <div className={styles.statusText}>
                  <Badge tone={result.status === 'active' ? 'success' : 'danger'}>
                    {result.status === 'active' ? 'شهادة سارية' : 'شهادة ملغاة'}
                  </Badge>
                  <p className={styles.statusHint}>
                    {result.status === 'active'
                      ? 'شهادة تجريبية صادرة من النموذج المقترح، وليست وثيقة رسمية من وزارة الإعلام.'
                      : 'أُلغيت هذه الشهادة ولم تعد سارية. راجع الجهة المصدرة للتفاصيل.'}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding={18} radius={20} gap={0}>
              <dl className={styles.fields}>
                <Row label="عنوان العمل" value={result.title} />
                <Row label="المؤلف" value={result.author} />
                <Row label="نوع العمل" value={result.workTypeLabel} />
                <Row label="رقم الإجازة" value={result.licenseNo} />
                <Row label="تاريخ الإجازة" value={result.licenseDate} />
                <Row label="رمز التحقق" value={result.code} ltr />
              </dl>
            </Card>
            <p className={styles.note}>تُعرض هنا الحقول المصرّح بإظهارها فقط، ولا تتضمن النص ولا بيانات التواصل.</p>
          </>
        )}
      </PageBody>
    </>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  );
}
