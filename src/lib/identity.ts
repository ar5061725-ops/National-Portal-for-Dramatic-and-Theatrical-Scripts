/** بيانات الهوية من البطاقة المدنية: الحقول، دليل التعبئة، والتحقق (يطابق التحقق في قاعدة البيانات). */

export interface IdentityValues {
  civilId: string;
  birthDate: string;
  cardSerial: string;
  nationality: string;
  area: string;
  block: string;
  street: string;
  building: string;
  floor: string;
  unit: string;
  paciNo: string;
}

export const EMPTY_IDENTITY: IdentityValues = {
  civilId: '',
  birthDate: '',
  cardSerial: '',
  nationality: 'كويتي',
  area: '',
  block: '',
  street: '',
  building: '',
  floor: '',
  unit: '',
  paciNo: '',
};

export type IdentityErrors = Partial<Record<keyof IdentityValues | 'confirmed', string>>;

/** دليل مكان كل حقل في البطاقة (الوجه الأمامي والخلفي للبطاقة المدنية الكويتية). */
export const IDENTITY_GUIDE: { field: string; side: 'الوجه الأمامي' | 'الوجه الخلفي'; hint: string }[] = [
  { field: 'الرقم المدني', side: 'الوجه الأمامي', hint: '12 رقماً بجوار «الرقم المدني / Civil ID No». يبدأ بـ 2 أو 3 ويتضمن تاريخ ميلادك.' },
  { field: 'تاريخ الميلاد', side: 'الوجه الأمامي', hint: 'بجوار «تاريخ الميلاد / Birth Date» بصيغة يوم/شهر/سنة، ويجب أن يطابق الرقم المدني.' },
  { field: 'الجنسية', side: 'الوجه الأمامي', hint: 'بجوار «الجنسية / Nationality» (مثال: كويتي / KWT).' },
  { field: 'الرقم المسلسل للبطاقة', side: 'الوجه الخلفي', hint: '10 أرقام بجوار «المسلسل / Serial No» أسفل الشريحة.' },
  { field: 'المنطقة والقطعة والشارع', side: 'الوجه الخلفي', hint: 'من سطر «العنوان»: المنطقة، ثم «القطعة»، ثم الشارع.' },
  { field: 'المبنى والدور والوحدة', side: 'الوجه الخلفي', hint: 'بجوار «المبنى» و«الدور» و«الوحدة» (مثال الوحدة: منزل أو رقم الشقة). الدور والوحدة اختياريان إن لم يظهرا.' },
  { field: 'الرقم الآلي للعنوان', side: 'الوجه الخلفي', hint: '8 أرقام بجوار «الرقم الآلي للعنوان» (اختياري).' },
];

const WEIGHTS = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

/** صيغة يوم/شهر/سنة من حقل التاريخ yyyy-mm-dd إلى YYMMDD. */
function toYymmdd(iso: string): string {
  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}`;
}

export function isValidCivilId(civilId: string, birthDate: string): boolean {
  if (!/^[23][0-9]{11}$/.test(civilId) || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const year = Number(birthDate.slice(0, 4));
  if (civilId.slice(1, 7) !== toYymmdd(birthDate)) return false;
  if ((civilId[0] === '2') !== (year < 2000)) return false;
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(civilId[i]), 0);
  const expected = 11 - (sum % 11);
  return expected >= 10 ? true : expected === Number(civilId[11]);
}

export function validateIdentity(v: IdentityValues, confirmed: boolean): IdentityErrors {
  const e: IdentityErrors = {};
  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{12}$/.test(v.civilId)) e.civilId = 'الرقم المدني 12 رقماً';
  if (!v.birthDate || v.birthDate < '1900-01-01' || v.birthDate > today) e.birthDate = 'أدخل تاريخ ميلاد صحيحاً';
  if (!e.civilId && !e.birthDate && !isValidCivilId(v.civilId, v.birthDate)) {
    e.civilId = 'الرقم المدني لا يطابق تاريخ الميلاد أو غير صحيح؛ راجع البطاقة';
  }
  if (!/^\d{10}$/.test(v.cardSerial)) e.cardSerial = 'الرقم المسلسل 10 أرقام';
  if (v.nationality.trim().length < 2) e.nationality = 'أدخل الجنسية';
  if (!v.area.trim()) e.area = 'أدخل المنطقة';
  if (!v.block.trim()) e.block = 'أدخل القطعة';
  if (!v.street.trim()) e.street = 'أدخل الشارع';
  if (!v.building.trim()) e.building = 'أدخل رقم المبنى';
  if (v.paciNo.trim() && !/^\d{8}$/.test(v.paciNo.trim())) e.paciNo = 'الرقم الآلي 8 أرقام';
  if (!confirmed) e.confirmed = 'يلزم الإقرار بمطابقة البيانات للبطاقة';
  return e;
}

/** حمولة RPC/بيانات التسجيل (مفاتيح snake_case كما تتوقعها القاعدة). */
export function toIdentityPayload(v: IdentityValues): Record<string, string> {
  return {
    civil_id: v.civilId.trim(),
    birth_date: v.birthDate,
    card_serial: v.cardSerial.trim(),
    nationality: v.nationality.trim(),
    area: v.area.trim(),
    block: v.block.trim(),
    street: v.street.trim(),
    building: v.building.trim(),
    floor: v.floor.trim(),
    unit: v.unit.trim(),
    paci_no: v.paciNo.trim(),
  };
}
