import { cn } from '@/lib/cn';
import styles from './QrCode.module.css';

interface QrCodeProps {
  /** ناتج qrSvg() من الخادم */
  svg: string;
  size?: number;
  label: string;
  className?: string;
}

/** يعرض رمز QR مولّداً على الخادم. المحتوى SVG موثوق (من مكتبة التوليد لا من مدخلات المستخدم). */
export function QrCode({ svg, size = 86, label, className }: QrCodeProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(styles.qr, className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
