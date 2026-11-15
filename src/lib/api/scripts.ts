import { PLACEHOLDERS } from '@/config/site';
import type { Certificate, CertificateVerification, ContactRequestInput, Script } from '@/types';
import { ApiError, wait } from './client';

const SCRIPTS: Script[] = [
  {
    id: 'bayt-ala-albahr',
    category: 'drama',
    title: 'بيت على البحر',
    kind: 'مسلسل درامي',
    genre: 'اجتماعي عائلي',
    score: 9,
    author: { name: 'عبدالله السالم', phone: '+965 5555 1234', email: 'a.alsalem@example.com' },
    logline:
      'بعد رحيل الجد، يجتمع أبناؤه في بيته القديم على شاطئ الكويت، فيكتشفون وصية تكشف سراً دفيناً منذ ثلاثين عاماً، ويقفون أمام خيار صعب: الإرث أم روابط الدم.',
    stats: [
      { label: 'عدد الحلقات', value: '30 حلقة' },
      { label: 'مدة الحلقة', value: '45 دقيقة' },
    ],
    licenseNo: PLACEHOLDERS.licenseNo,
    licenseDate: PLACEHOLDERS.date,
  },
  {
    id: 'layla-fi-alsouq',
    category: 'theatre',
    title: 'ليلة في السوق القديم',
    kind: 'نص مسرحي',
    genre: 'كوميدي اجتماعي',
    score: 7,
    author: { name: 'نورة الكندري', phone: '+965 6666 5678', email: 'n.alkandari@example.com' },
    logline:
      'تاجر بسيط في سوق المباركية يعثر على صندوق غامض في دكانه، فتنقلب ليلته إلى سلسلة من المواقف المضحكة مع جيران يحاول كل منهم الاستيلاء عليه.',
    stats: [
      { label: 'عدد الفصول', value: '3 فصول' },
      { label: 'مدة العرض', value: '90 دقيقة' },
    ],
    licenseNo: PLACEHOLDERS.licenseNo,
    licenseDate: PLACEHOLDERS.date,
  },
  {
    id: 'thil-alnakhla',
    category: 'drama',
    title: 'ظل النخلة',
    kind: 'مسلسل درامي',
    genre: 'تاريخي',
    score: 8,
    author: { name: 'فهد العنزي', phone: '+965 9999 4321', email: 'f.alenezi@example.com' },
    logline:
      'في كويت الأربعينيات، يحلم ابن نوخذة بدراسة الطب بعيداً عن البحر، لكن غرق سفينة والده يجبره على قيادة الطاقم في رحلة غوص أخيرة تحدد مصير العائلة.',
    stats: [
      { label: 'عدد الحلقات', value: '15 حلقة' },
      { label: 'مدة الحلقة', value: '45 دقيقة' },
    ],
    licenseNo: PLACEHOLDERS.licenseNo,
    licenseDate: PLACEHOLDERS.date,
  },
  {
    id: 'hikayat-alfreej',
    category: 'theatre',
    title: 'حكاية الفريج',
    kind: 'نص مسرحي',
    genre: 'تراثي للأطفال',
    score: 10,
    author: { name: 'مريم الرشيدي', phone: '+965 5050 2020', email: 'm.alrashidi@example.com' },
    logline:
      'أطفال الفريج يكتشفون أن حكايات الجدة الليلية تتحول إلى حقيقة، فيخوضون مغامرة مرحة لإنقاذ ألعاب الماضي من النسيان.',
    stats: [
      { label: 'عدد الفصول', value: 'فصلان' },
      { label: 'مدة العرض', value: '60 دقيقة' },
    ],
    licenseNo: PLACEHOLDERS.licenseNo,
    licenseDate: PLACEHOLDERS.date,
  },
];

/** رموز التحقق للشهادات (في النظام الحقيقي: عشوائية وفريدة وتُحفظ في جدول certificates). */
const VERIFY_CODES: Record<string, { code: string; status: 'active' | 'revoked' }> = {
  'bayt-ala-albahr': { code: 'KDD-7F3Q-92XA', status: 'active' },
};

export async function getApprovedScripts(): Promise<Script[]> {
  await wait();
  return SCRIPTS;
}

export async function getScriptById(id: string): Promise<Script | null> {
  await wait();
  return SCRIPTS.find((s) => s.id === id) ?? null;
}

export async function getCertificate(scriptId: string): Promise<Certificate | null> {
  const script = await getScriptById(scriptId);
  const verification = VERIFY_CODES[scriptId];
  if (!script || !verification) return null;
  const [length] = script.stats;
  return {
    scriptId: script.id,
    title: script.title,
    author: script.author.name,
    workTypeLabel: script.kind,
    genre: script.genre,
    lengthLabel: length.label,
    lengthValue: length.value,
    licenseNo: script.licenseNo,
    licenseDate: script.licenseDate,
    workNo: PLACEHOLDERS.workNo,
    score: script.score,
    verifyCode: verification.code,
    status: verification.status,
  };
}

/** التحقق العام من شهادة: يعيد الحقول المصرّح بإظهارها فقط. */
export async function verifyCertificate(code: string): Promise<CertificateVerification | null> {
  await wait();
  const entry = Object.entries(VERIFY_CODES).find(([, v]) => v.code === code.toUpperCase());
  if (!entry) return null;
  const [scriptId, { status }] = entry;
  const script = SCRIPTS.find((s) => s.id === scriptId);
  if (!script) return null;
  return {
    code: code.toUpperCase(),
    status,
    title: script.title,
    author: script.author.name,
    workTypeLabel: script.kind,
    licenseNo: script.licenseNo,
    licenseDate: script.licenseDate,
  };
}

/** طلب تواصل من منتج موثّق؛ يقرر الكاتب قبوله أو رفضه ولا تُكشف بياناته قبل موافقته. */
export async function requestContact(input: ContactRequestInput): Promise<void> {
  await wait(800);
  if (!SCRIPTS.some((s) => s.id === input.scriptId)) throw new ApiError('العمل غير موجود', 404);
  if (input.purpose.trim().length < 10) throw new ApiError('اكتب غرض التواصل في جملة واضحة (10 أحرف على الأقل)', 422);
}
