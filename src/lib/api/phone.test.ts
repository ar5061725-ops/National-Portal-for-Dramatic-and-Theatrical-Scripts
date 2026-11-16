import { describe, expect, it } from 'vitest';
import { normalizePhone } from './auth';

describe('normalizePhone', () => {
  it('رقم كويتي من 8 أرقام يصبح +965', () => {
    expect(normalizePhone('99999999')).toBe('+96599999999');
    expect(normalizePhone('9999 9999')).toBe('+96599999999');
  });
  it('الصيغة الدولية تُقبل كما هي', () => {
    expect(normalizePhone('+966512345678')).toBe('+966512345678');
  });
  it('الصيغ الخاطئة ترجع null', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('+0123456789')).toBeNull();
  });
});
