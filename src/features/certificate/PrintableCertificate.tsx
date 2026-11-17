import { ROUTES } from '@/config/routes';
import { SITE } from '@/config/site';
import type { Certificate } from '@/types';
import { Logo } from '@/components/ui/Logo';
import { QrCode } from '@/components/ui/QrCode';
import { StarRating } from '@/components/ui/StarRating';
import { scoreText } from '@/lib/text';
import { FitToWidth } from './FitToWidth';
import { PrintToolbar } from './PrintToolbar';
import styles from './PrintableCertificate.module.css';

function Cell({ label, value, gold, last }: { label: string; value: string; gold?: boolean; last?: boolean }) {
  return (
    <div className={`${styles.cell} ${gold ? styles.cellGold : ''} ${last ? styles.cellLast : ''}`}>
      <span className={styles.cellLabel}>{label}</span>
      <b className={styles.cellValue}>{value}</b>
    </div>
  );
}

export function PrintableCertificate({ certificate, qrSvg }: { certificate: Certificate; qrSvg: string }) {
  return (
    <div className={styles.page}>
      <PrintToolbar backHref={ROUTES.certificate(certificate.scriptId)} />
      <FitToWidth designWidth={1123} designHeight={794}>
        <div className={styles.sheet} dir="rtl">
          <div className={styles.outer}>
            <div className={styles.inner}>
              <div className={styles.top}>
                <div className={styles.issuer}>
                  <b>{SITE.country}</b>
                  <span>{SITE.ministry}</span>
                  <span className={styles.issuerSub}>{SITE.name}</span>
                </div>
                <Logo size={104} bordered={false} />
                <div className={styles.meta}>
                  <span>
                    رقم الإجازة: <b>{certificate.licenseNo}</b>
                  </span>
                  <span>
                    تاريخ الإصدار: <b>{certificate.licenseDate}</b>
                  </span>
                </div>
              </div>

              <div className={styles.titleBlock}>
                <h1 className={styles.title}>شهادة إجازة نص وحفظ حقوق الملكية</h1>
                <div className={styles.ornament} aria-hidden="true">
                  <span />
                  <i />
                  <span />
                </div>
                <p className={styles.statement}>
                  شهادة تجريبية لعرض الفكرة فقط (ليست صادرة عن وزارة الإعلام): النص الموضحة بياناته أدناه اجتاز مراجعة لجنة النصوص في هذا النموذج.
                </p>
              </div>

              <div className={styles.details}>
                <div className={styles.grid}>
                  <Cell label="عنوان العمل" value={certificate.title} />
                  <Cell label="اسم المؤلف" value={certificate.author} />
                  <Cell label="نوع العمل" value={certificate.workTypeLabel} last />
                  <Cell label="التصنيف" value={certificate.genre} />
                  <Cell label={certificate.lengthLabel} value={certificate.lengthValue} />
                  <Cell label="رقم المصنف لدى المكتبة الوطنية" value={certificate.workNo} gold last />
                </div>
                <div className={styles.scoreBox}>
                  <span className={styles.scoreLabel}>تقييم لجنة المراجعة</span>
                  <span dir="ltr" className={styles.scoreValue}>
                    {scoreText(certificate.score)}
                  </span>
                  <StarRating value={certificate.score} size={15} />
                </div>
              </div>

              <p className={styles.rights}>
                تُحفظ جميع حقوق الملكية الفكرية لهذا النص لمؤلفه، ولا يجوز نسخه أو اقتباسه أو إنتاجه كلياً أو جزئياً دون موافقة كتابية منه، وذلك وفقاً لقانون حقوق المؤلف والحقوق المجاورة المعمول به في دولة الكويت.
              </p>

              <div className={styles.spacer} />

              <div className={styles.signatures}>
                <div className={styles.signature}>
                  <span className={styles.line} />
                  <b>رئيس لجنة مراجعة النصوص</b>
                  <span>التوقيع</span>
                </div>
                <div className={styles.stamp}>نموذج تجريبي</div>
                <div className={styles.qrBox}>
                  <QrCode svg={qrSvg} size={104} label="رمز QR للتحقق من الشهادة" />
                  <b dir="ltr" className={styles.verifyCode}>{certificate.verifyCode}</b>
                </div>
                <div className={styles.signature}>
                  <span className={styles.line} />
                  <b>وكيل وزارة الإعلام</b>
                  <span>التوقيع</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FitToWidth>
    </div>
  );
}
