/**
 * عميل MyFatoorah (خادم فقط). يستخدم المفتاح من PAYMENT_API_KEY عبر credentials.ts.
 * الرابط الأساسي من MYFATOORAH_BASE_URL، وافتراضيه بيئة الاختبار (Sandbox) للكويت:
 *   https://apitest.myfatoorah.com   (الإنتاج: https://api.myfatoorah.com)
 * ملاحظة: يجب أن يكون المفتاح مولَّداً من حساب MyFatoorah نفسه (توكن API)؛ وإلا يرد المزوّد 401.
 */
import { PaymentConfigError, paymentAuthHeaders } from './credentials';

const DEFAULT_BASE_URL = 'https://apitest.myfatoorah.com';

export class MyFatoorahError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'MyFatoorahError';
  }
}

export interface CreateInvoiceInput {
  /** المبلغ بالدينار الكويتي (مثال: 5 أو 5.5) */
  amount: number;
  customerName: string;
  customerEmail?: string;
  /** مرجعنا الفريد (merchant_ref) لربط الدفع بالطلب */
  reference: string;
  callbackUrl: string;
  errorUrl: string;
  currency?: string;
  language?: 'AR' | 'EN';
}

export interface CreatedInvoice {
  invoiceId: number;
  paymentUrl: string;
}

export interface InvoiceStatus {
  invoiceId: number;
  status: string;
  reference: string | null;
  paidAmount: number;
  currency: string;
}

function baseUrl(): string {
  return (process.env.MYFATOORAH_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function call<T>(path: string, body: unknown): Promise<T> {
  let headers: Record<string, string>;
  try {
    headers = paymentAuthHeaders();
  } catch (e) {
    if (e instanceof PaymentConfigError) throw e;
    throw e;
  }
  const res = await fetch(`${baseUrl()}${path}`, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
  const json = (await res.json().catch(() => null)) as { IsSuccess?: boolean; Message?: string; ValidationErrors?: unknown; Data?: T } | null;
  if (!res.ok || !json?.IsSuccess || !json.Data) {
    throw new MyFatoorahError(json?.Message ?? `فشل الاتصال بمزوّد الدفع (${res.status})`, res.status, json?.ValidationErrors);
  }
  return json.Data;
}

/** ينشئ فاتورة دفع (SendPayment) ويعيد رابط صفحة الدفع. */
export async function createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
  if (!(input.amount > 0)) throw new MyFatoorahError('المبلغ يجب أن يكون أكبر من صفر', 422);
  const data = await call<{ InvoiceId: number; InvoiceURL: string }>('/v2/SendPayment', {
    NotificationOption: 'LNK',
    InvoiceValue: input.amount,
    CustomerName: input.customerName,
    CustomerEmail: input.customerEmail,
    CustomerReference: input.reference,
    DisplayCurrencyIso: input.currency ?? 'KWD',
    CallBackUrl: input.callbackUrl,
    ErrorUrl: input.errorUrl,
    Language: input.language ?? 'AR',
  });
  return { invoiceId: data.InvoiceId, paymentUrl: data.InvoiceURL };
}

/** يستعلم عن حالة فاتورة (GetPaymentStatus) بمعرّف الفاتورة أو الدفعة. */
export async function getInvoiceStatus(key: string | number, keyType: 'InvoiceId' | 'PaymentId' = 'InvoiceId'): Promise<InvoiceStatus> {
  const data = await call<{
    InvoiceId: number;
    InvoiceStatus: string;
    CustomerReference: string | null;
    InvoiceValue: number;
    InvoiceDisplayValue?: string;
    InvoiceTransactions?: { Currency?: string }[];
  }>('/v2/GetPaymentStatus', { Key: String(key), KeyType: keyType });
  return {
    invoiceId: data.InvoiceId,
    status: data.InvoiceStatus,
    reference: data.CustomerReference,
    paidAmount: data.InvoiceValue,
    currency: normalizeCurrency(data.InvoiceTransactions?.[0]?.Currency),
  };
}

/** المزوّد يعيد أحياناً رمزاً مختصراً (KD)؛ نوحّده إلى ISO (KWD) ليطابق ما نخزّنه. */
export function normalizeCurrency(raw: string | undefined | null): string {
  const code = (raw ?? '').trim().toUpperCase();
  if (!code || code === 'KD' || code === 'KWD') return 'KWD';
  return code;
}
