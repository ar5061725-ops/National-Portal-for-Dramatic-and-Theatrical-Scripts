import { MAX_PDF_MB } from '@/config/submission';

/** يعيد رسالة الخطأ، أو null إذا كان الملف صالحاً. */
export function validatePdf(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) return 'الملف يجب أن يكون بصيغة PDF';
  if (file.size > MAX_PDF_MB * 1024 * 1024) return `الحد الأقصى لحجم الملف ${MAX_PDF_MB} ميغابايت`;
  return null;
}
