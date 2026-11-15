import QRCode from 'qrcode';
import { ROUTES } from '@/config/routes';
import { SITE_URL } from '@/config/site';

/** رابط التحقق العام من شهادة. */
export function verifyUrl(code: string): string {
  return `${SITE_URL}${ROUTES.verify(code)}`;
}

/** رمز QR كـ SVG نصّي (يُولَّد على الخادم، لا يحتاج صورة ولا خدمة خارجية). */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#0F2A44', light: '#FFFFFF' },
  });
}
