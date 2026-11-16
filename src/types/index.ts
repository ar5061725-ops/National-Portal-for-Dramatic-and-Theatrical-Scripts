export type ScriptCategory = 'drama' | 'theatre';
export type WorkType = 'play' | 'series' | 'film';

/** مسودة ← بانتظار الدفع ← مستلم ← قيد المراجعة ← مطلوب تعديل أو مجاز أو مرفوض */
export type RequestStatus = 'draft' | 'awaiting_payment' | 'received' | 'review' | 'revision' | 'approved' | 'rejected';

export type DecisionId = 'approve' | 'revise' | 'reject';
export type PaymentMethodId = 'knet' | 'card' | 'apple';
export type RequiredFileId = 'exec' | 'treatment' | 'author' | 'script';
export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface Contact {
  name: string;
  phone: string;
  email: string;
}

export interface LabelledValue {
  label: string;
  value: string;
}

/** بطاقة نص مجاز في الدليل: بيانات مختصرة، وبيانات التواصل لا تُعرض إلا بعد موافقة المؤلف. */
export interface Script {
  id: string;
  category: ScriptCategory;
  title: string;
  kind: string;
  genre: string;
  score: number;
  author: Contact;
  logline: string;
  /** أول عنصر هو "الطول" الذي يظهر في البطاقة (عدد الحلقات / الفصول). */
  stats: LabelledValue[];
  licenseNo: string;
  licenseDate: string;
}

export interface ScriptRequest {
  id: string;
  title: string;
  meta: string;
  status: RequestStatus;
  /** عدد المراحل المكتملة من 4. */
  step: number;
  no: string;
  scriptId?: string;
  /** سبب القرار عند الرفض أو طلب التعديل (القرار مسبَّب). */
  reason?: string;
}

export interface CommitteeNote {
  no: number;
  where: string;
  text: string;
}

export interface FeedbackThread {
  request: ScriptRequest & { kind: string };
  notes: CommitteeNote[];
}

export interface PayableRequest {
  /** رقم الطلب العام (NSP-…) */
  id: string;
  /** معرّف الطلب في القاعدة (يُرسل لدالة الدفع) */
  submissionId?: string;
  title: string;
  workDescription: string;
  filesCount: number;
  /** رسم التقديم الحالي بالفلس (1000 فلس = 1 د.ك)؛ null إن لم يُضبط */
  feeMinor?: number | null;
}

/** نتيجة دفع مؤكدة لطلب (من الخادم بعد التحقق من المزوّد). */
export interface PaidResult {
  publicNo: string;
  receiptNo: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  /** رقم الطلب المرتبط بالإشعار */
  requestNo?: string;
  /** وقت قراءة المستخدم للإشعار؛ غائب = غير مقروء */
  readAt?: string;
  unread: boolean;
  tone: Tone;
  icon: 'check' | 'warning' | 'clock' | 'receipt';
  href: string;
}

export type ReceiptStatus = 'paid' | 'partially_refunded' | 'refunded';

export interface Receipt {
  id: string;
  title: string;
  method: string;
  dateLabel: string;
  amountLabel: string;
  status: ReceiptStatus;
}

export interface UserAccount extends Contact {
  role: string;
}

export interface ProfileData {
  user: UserAccount;
  stats: { submitted: number; approved: number; needsRevision: number };
}

/** عنصر في قائمة المراجعة: نسخة منزوعة الهوية تُعرَّف برمز الطلب فقط. */
export interface CommitteeQueueItem {
  id: string;
  code: string;
  meta: string;
}

export interface CommitteeOverview {
  stats: { pending: number; revised: number; decided: number };
  queue: CommitteeQueueItem[];
}

export interface ReviewNoteInput {
  /** الموقع: صفحة أو مشهد */
  locator: string;
  body: string;
  /** مقترحة للمؤلف: لا تظهر له إلا بعد اعتماد المشرف ونشر النتيجة */
  proposedForAuthor?: boolean;
  requiresRevision?: boolean;
  requiredAction?: string;
  completionCriterion?: string;
}

export interface CriterionScoreInput {
  score: number;
  rationale: string;
  locator: string;
}

/** تقييم مراجع: درجة وتبرير لكل معيار + توصية (القرار النهائي للمشرف). */
export interface ReviewSubmitInput {
  itemId: string;
  scores: Record<string, CriterionScoreInput>;
  recommendation: DecisionId;
  notes: ReviewNoteInput[];
}

export interface ReviewSubmitResult {
  total: number;
}

export interface RoundReviewSummary {
  label: string;
  score: number | null;
  recommendation: DecisionId | null;
  isArbitration: boolean;
}

/** ملخص جولة التقييم للمشرف: يُظهر الدرجات المرسلة دون هوية المراجعين. */
export interface RoundSummary {
  roundId: string;
  code: string;
  status: 'collecting' | 'arbitration' | 'awaiting_decision' | 'decided' | 'published';
  aggregateScore: number | null;
  recommended: DecisionId | null;
  reviews: RoundReviewSummary[];
}

export interface RoundDecisionInput {
  roundId: string;
  outcome: DecisionId;
  authorReason: string;
  internalReason: string;
}

export interface Certificate {
  scriptId: string;
  title: string;
  author: string;
  workTypeLabel: string;
  genre: string;
  lengthLabel: string;
  lengthValue: string;
  licenseNo: string;
  licenseDate: string;
  workNo: string;
  score: number;
  verifyCode: string;
  status: 'active' | 'revoked';
}

/** الحقول المصرّح بإظهارها للعموم عند التحقق من شهادة. */
export interface CertificateVerification {
  code: string;
  status: 'active' | 'revoked';
  title: string;
  author: string;
  workTypeLabel: string;
  licenseNo: string;
  licenseDate: string;
}

export interface ContactRequestInput {
  scriptId: string;
  purpose: string;
}

export type SupportTopic = 'payment' | 'account' | 'review' | 'other';

export interface SupportTicketInput {
  topic: SupportTopic;
  requestNo: string;
  message: string;
}

export interface SubmissionDraft {
  /** undefined = استخدم بيانات الحساب. */
  name?: string;
  phone?: string;
  email?: string;
  title: string;
  type: WorkType;
  genres: string[];
  /** المفتاح: `${type}.${fieldId}`. */
  details: Record<string, string>;
  logline: string;
  workNo: string;
  files: Partial<Record<RequiredFileId, string>>;
  /** يُصدر عند الإرسال (قفل النسخة)، وهو معرّف صفحة الدفع. */
  requestNo?: string;
  /** نسخة المسودة المنشأة في Supabase (لاستئناف محاولة تقديم فاشلة دون تكرار الطلب). */
  versionId?: string;
  /** وقت آخر حفظ للمسودة (ISO). */
  savedAt?: string;
}
