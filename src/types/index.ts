export type ScriptCategory = 'drama' | 'theatre';
export type WorkType = 'play' | 'series' | 'film';
export type RequestStatus = 'review' | 'revision' | 'approved';
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

export interface ScriptFile {
  id: string;
  label: string;
  size: string;
}

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
  files: ScriptFile[];
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
}

export interface CommitteeNote {
  no: number;
  where: string;
  text: string;
}

export interface FeedbackThread {
  request: Pick<ScriptRequest, 'id' | 'title'> & { kind: string };
  notes: CommitteeNote[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  tone: Tone;
  icon: 'check' | 'warning' | 'clock' | 'receipt';
  href: string;
}

export interface Receipt {
  id: string;
  title: string;
  method: string;
  dateLabel: string;
  amountLabel: string;
}

export interface UserAccount extends Contact {
  role: string;
}

export interface ProfileData {
  user: UserAccount;
  stats: { submitted: number; approved: number; needsRevision: number };
}

export interface CommitteeQueueItem {
  id: string;
  title: string;
  meta: string;
}

export interface CommitteeOverview {
  stats: { pending: number; revised: number; decided: number };
  queue: CommitteeQueueItem[];
}

export interface CommitteeDecisionInput {
  scriptId: string;
  score: number;
  decision: DecisionId;
  notes: string;
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
}
