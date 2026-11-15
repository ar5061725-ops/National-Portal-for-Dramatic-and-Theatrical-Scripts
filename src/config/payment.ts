import type { PaymentMethodId } from '@/types';

/** حالة الدفع الداخلية ← رسالة المستخدم (كما في وثيقة المشروع). */
export const PAYMENT_MESSAGES = {
  pending: 'جارٍ التحقق من الدفع',
  paid: 'تم تأكيد الدفع، حمّل الإيصال',
  failed: 'لم يكتمل الدفع، يمكنك إعادة المحاولة بعد حسم العملية',
  refunded: 'تم استرداد جزء من المبلغ أو المبلغ كاملاً وفق العملية',
} as const;

/** التجربة الأولى عبر كي نت؛ البطاقات وApple Pay تُفعَّل بعد تأكيد أهلية حساب الجهة. */
export const PAYMENT_METHODS: { id: PaymentMethodId; label: string; hint: string; available: boolean }[] = [
  { id: 'knet', label: 'كي نت', hint: 'الدفع ببطاقة البنك المحلية', available: true },
  { id: 'card', label: 'بطاقة ائتمانية', hint: 'فيزا أو ماستركارد · قريباً', available: false },
  { id: 'apple', label: 'Apple Pay', hint: 'الدفع السريع من الآيفون · قريباً', available: false },
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodId, string> = {
  knet: 'كي نت',
  card: 'بطاقة ائتمانية',
  apple: 'Apple Pay',
};
