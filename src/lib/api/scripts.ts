import { PLACEHOLDERS } from '@/config/site';
import type { Certificate, Script } from '@/types';
import { wait } from './client';

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
    files: [
      { id: 'exec', label: 'الملف التنفيذي', size: '2.4 MB' },
      { id: 'logline', label: 'اللوجلاين', size: '180 KB' },
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
    files: [
      { id: 'exec', label: 'الملف التنفيذي', size: '1.1 MB' },
      { id: 'logline', label: 'اللوجلاين', size: '95 KB' },
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
    files: [
      { id: 'exec', label: 'الملف التنفيذي', size: '3.0 MB' },
      { id: 'logline', label: 'اللوجلاين', size: '150 KB' },
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
    files: [
      { id: 'exec', label: 'الملف التنفيذي', size: '1.6 MB' },
      { id: 'logline', label: 'اللوجلاين', size: '110 KB' },
    ],
    licenseNo: PLACEHOLDERS.licenseNo,
    licenseDate: PLACEHOLDERS.date,
  },
];

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
  if (!script) return null;
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
  };
}
