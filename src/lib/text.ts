/** توحيد النص العربي للبحث: إزالة التشكيل وتوحيد الألف والياء والتاء المربوطة. */
export function normalizeArabic(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}

export function mailHref(email: string): string {
  return `mailto:${email}`;
}

export function scoreText(score: number, max = 10): string {
  return `${score}/${max}`;
}
