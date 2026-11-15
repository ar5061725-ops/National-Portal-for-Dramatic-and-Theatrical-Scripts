/**
 * إعدادات مزوّد الدفع. تُستخدم على الخادم فقط (Server Components وRoute Handlers وServer Actions).
 * المفتاح يُقرأ من متغير البيئة PAYMENT_API_KEY ولا يُكتب في الكود ولا يُرسل للمتصفح.
 */

export interface PaymentCredentials {
  apiKey: string;
}

export class PaymentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConfigError';
  }
}

/** يعيد مفتاح API للدفع، أو يرمي PaymentConfigError برسالة واضحة إن لم يكن مضبوطاً. */
export function getPaymentCredentials(): PaymentCredentials {
  if (typeof window !== 'undefined') {
    // حماية إضافية: أي استدعاء من المتصفح خطأ برمجي لأنه سيكشف المفتاح
    throw new PaymentConfigError('getPaymentCredentials يجب أن تُستدعى على الخادم فقط');
  }

  const apiKey = process.env.PAYMENT_API_KEY?.trim();
  if (!apiKey) {
    throw new PaymentConfigError('المتغير PAYMENT_API_KEY غير مضبوط. أضفه في .env.local (محلياً) أو في إعدادات Vercel.');
  }
  return { apiKey };
}

/** هل المفتاح مضبوط؟ (دون كشفه). مفيد لإخفاء خيارات الدفع عند عدم الإعداد. */
export function isPaymentConfigured(): boolean {
  return Boolean(process.env.PAYMENT_API_KEY?.trim());
}

/** رأس Authorization لطلبات مزوّد الدفع (صيغة Bearer الشائعة؛ عدّلها حسب وثائق المزوّد). */
export function paymentAuthHeaders(): Record<string, string> {
  const { apiKey } = getPaymentCredentials();
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}
