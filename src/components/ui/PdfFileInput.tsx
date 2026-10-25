'use client';

import type { ChangeEvent } from 'react';
import { validatePdf } from '@/lib/files';

interface PdfFileInputProps {
  ariaLabel: string;
  onFile: (file: File) => void;
  onError: (message: string) => void;
}

/**
 * حقل رفع PDF مخفي بصرياً. يوضع داخل <label> منسّقة من الأب،
 * ويتحقق من النوع والحجم قبل تمرير الملف.
 */
export function PdfFileInput({ ariaLabel, onFile, onError }: PdfFileInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // إعادة التعيين تسمح باختيار الملف نفسه مرة ثانية بعد الخطأ
    event.target.value = '';
    if (!file) return;
    const error = validatePdf(file);
    if (error) onError(error);
    else onFile(file);
  }

  return <input type="file" accept="application/pdf" className="visually-hidden" aria-label={ariaLabel} onChange={handleChange} />;
}
