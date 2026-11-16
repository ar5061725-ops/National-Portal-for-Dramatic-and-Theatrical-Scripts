import { describe, expect, it } from 'vitest';
import { EMPTY_IDENTITY, isValidCivilId, validateIdentity } from './identity';

const WEIGHTS = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

/** يبني رقماً مدنياً صحيحاً (رقم فحصي صحيح) لتاريخ ميلاد اختباري، دون استخدام بيانات حقيقية. */
function makeCivilId(birthIso: string, serial = '0000'): string {
  const century = Number(birthIso.slice(0, 4)) < 2000 ? '2' : '3';
  const prefix = `${century}${birthIso.slice(2, 4)}${birthIso.slice(5, 7)}${birthIso.slice(8, 10)}${serial}0`.slice(0, 11);
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(prefix[i]), 0);
  const check = 11 - (sum % 11);
  return `${prefix}${check >= 10 ? 0 : check}`;
}

describe('isValidCivilId', () => {
  const birth = '1990-05-15';
  const id = makeCivilId(birth);

  it('يقبل رقماً مطابقاً لتاريخ الميلاد', () => {
    expect(isValidCivilId(id, birth)).toBe(true);
  });
  it('يرفض تاريخاً مخالفاً أو قرناً مخالفاً', () => {
    expect(isValidCivilId(id, '1990-05-16')).toBe(false);
    expect(isValidCivilId(id, '2090-05-15')).toBe(false);
  });
  it('يرفض الطول والصيغة الخاطئة', () => {
    expect(isValidCivilId(id.slice(0, 11), birth)).toBe(false);
    expect(isValidCivilId('x'.repeat(12), birth)).toBe(false);
  });
});

describe('validateIdentity', () => {
  const base = {
    ...EMPTY_IDENTITY,
    civilId: makeCivilId('1990-05-15'),
    birthDate: '1990-05-15',
    cardSerial: '1234567890',
    area: 'منطقة',
    block: '1',
    street: '2',
    building: '3',
  };

  it('بيانات صحيحة مع الإقرار بلا أخطاء', () => {
    expect(validateIdentity(base, true)).toEqual({});
  });
  it('الإقرار إلزامي', () => {
    expect(validateIdentity(base, false).confirmed).toBeTruthy();
  });
  it('الرقم المسلسل 10 أرقام والحقول الأساسية مطلوبة', () => {
    const errors = validateIdentity({ ...base, cardSerial: '123', area: '', building: '' }, true);
    expect(errors.cardSerial).toBeTruthy();
    expect(errors.area).toBeTruthy();
    expect(errors.building).toBeTruthy();
  });
  it('الرقم الآلي اختياري لكنه 8 أرقام إن وُجد', () => {
    expect(validateIdentity({ ...base, paciNo: '123' }, true).paciNo).toBeTruthy();
    expect(validateIdentity({ ...base, paciNo: '12345678' }, true).paciNo).toBeUndefined();
  });
});
