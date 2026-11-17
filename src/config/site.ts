export const SITE = {
  name: 'البوابة الوطنية للنصوص الدرامية والمسرحية',
  shortName: 'البوابة الوطنية للنصوص',
  ministry: 'وزارة الإعلام',
  country: 'دولة الكويت',
  version: '1.0',
} as const;

/** تعريف المشروع: نموذج تجريبي وليس منصة رسمية. */
export const DEMO = {
  badge: 'نموذج تجريبي',
  short: 'نموذج تجريبي مقدَّم كمقترح إلى معالي وزير الإعلام',
  full: 'نموذج تجريبي مقدَّم كمقترح إلى معالي وزير الإعلام، ضمن مشروع التخرج لمعسكر بناء التطبيقات باستخدام أدوات الذكاء الاصطناعي لدى معهد كودد (Coded). وليس منصة رسمية تابعة للوزارة، وجميع البيانات والشهادات والمدفوعات فيه لأغراض العرض فقط.',
} as const;

/**
 * قيم لم تحددها الوزارة بعد (ظهرت بين أقواس في التصميم الأصلي).
 * عدّلها هنا فقط وستتحدث في كل الشاشات.
 */
export const PLACEHOLDERS = {
  fee: '[الرسوم]',
  totalFees: '[المجموع]',
  reviewDuration: '[المدة]',
  date: '[التاريخ]',
  licenseNo: '[الرقم]',
  workNo: '[رقم المصنف]',
} as const;

/** عنوان الموقع المنشور (يُستخدم في روابط التحقق ورموز QR). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://national-scripts-portal.vercel.app').replace(/\/$/, '');

export const CURRENCY = 'د.ك';

export const MESSAGES = {
  forgotPassword: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك',
  certificateDownloaded: 'تم تحميل الشهادة بصيغة PDF',
  openingFile: 'جارٍ فتح الملف…',
  receiptDownloaded: 'تم تحميل الإيصال',
  shareLinkCopied: 'تم نسخ رابط المشاركة',
  editProfileOpened: 'تم فتح تعديل البيانات',
  draftSaved: 'تم حفظ المسودة',
  confirmationResent: 'أعدنا إرسال رابط التأكيد إلى بريدك',
  genericError: 'حدث خطأ غير متوقع، حاول مرة أخرى',
} as const;

export const SHARE = {
  title: 'شهادة إجازة نص',
  text: 'شهادة إجازة نص من البوابة الوطنية للنصوص الدرامية والمسرحية',
} as const;
