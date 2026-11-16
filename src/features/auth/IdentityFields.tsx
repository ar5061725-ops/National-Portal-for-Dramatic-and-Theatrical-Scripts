'use client';

import { IDENTITY_GUIDE } from '@/lib/identity';
import type { IdentityErrors, IdentityValues } from '@/lib/identity';
import { TextField } from '@/components/ui/TextField';
import styles from './IdentityFields.module.css';

interface Props {
  values: IdentityValues;
  errors: IdentityErrors;
  confirmed: boolean;
  onChange: (key: keyof IdentityValues, value: string) => void;
  onConfirm: (value: boolean) => void;
}

/** حقول الهوية المنقولة من البطاقة المدنية مع الدليل الإرشادي والإقرار الإلزامي بمطابقة البيانات. */
export function IdentityFields({ values, errors, confirmed, onChange, onConfirm }: Props) {
  const field = (key: keyof IdentityValues) => ({
    value: values[key],
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value),
  });

  return (
    <div className={styles.wrap}>
      <section className={styles.guide} aria-labelledby="identity-guide-title">
        <h3 id="identity-guide-title" className={styles.guideTitle}>
          دليل تعبئة البيانات من بطاقتك المدنية (إلزامي)
        </h3>
        <p className={styles.guideLead}>انقل البيانات كما هي مطبوعة على البطاقة المدنية الأصلية. يُتحقق من تطابق الرقم المدني مع تاريخ الميلاد، وأي بيانات غير مطابقة تُرفض.</p>
        <ol className={styles.guideList}>
          {IDENTITY_GUIDE.map((item) => (
            <li key={item.field}>
              <b>{item.field}</b> <span className={styles.side}>({item.side})</span>
              <span className={styles.hint}>{item.hint}</span>
            </li>
          ))}
        </ol>
      </section>

      <TextField label="الرقم المدني" ltr inputMode="numeric" maxLength={12} placeholder="12 رقماً" autoComplete="off" {...field('civilId')} />
      <TextField label="تاريخ الميلاد" type="date" lang="ar" hint="اختر اليوم والشهر والسنة من التقويم" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} {...field('birthDate')} />
      <TextField label="الرقم المسلسل للبطاقة المدنية" ltr inputMode="numeric" maxLength={10} placeholder="10 أرقام (خلف البطاقة)" autoComplete="off" {...field('cardSerial')} />
      <TextField label="الجنسية" placeholder="كويتي" {...field('nationality')} />

      <fieldset className={styles.address}>
        <legend>عنوان السكن (خلف البطاقة)</legend>
        <TextField label="المنطقة" {...field('area')} />
        <div className={styles.row}>
          <TextField label="القطعة" {...field('block')} />
          <TextField label="الشارع" {...field('street')} />
        </div>
        <div className={styles.row}>
          <TextField label="المبنى" {...field('building')} />
          <TextField label="الدور (اختياري)" {...field('floor')} />
        </div>
        <div className={styles.row}>
          <TextField label="الوحدة (اختياري)" placeholder="منزل أو رقم الشقة" {...field('unit')} />
          <TextField label="الرقم الآلي للعنوان (اختياري)" ltr inputMode="numeric" maxLength={8} {...field('paciNo')} />
        </div>
      </fieldset>

      <label className={styles.confirm}>
        <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} />
        <span>أقرّ بأنني اطلعت على الدليل أعلاه وأن البيانات مطابقة لبطاقتي المدنية، وأتحمل مسؤولية صحتها.</span>
      </label>
      {errors.confirmed && (
        <p role="alert" className={styles.error}>
          {errors.confirmed}
        </p>
      )}
    </div>
  );
}
