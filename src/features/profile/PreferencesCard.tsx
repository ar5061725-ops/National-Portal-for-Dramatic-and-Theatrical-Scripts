'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import styles from './PreferencesCard.module.css';

const STORAGE_KEY = 'nsp.contact-preferences.v1';

interface Preferences {
  emailUpdates: boolean;
  emailReceipts: boolean;
}

const DEFAULTS: Preferences = { emailUpdates: true, emailReceipts: true };

const OPTIONS: { id: keyof Preferences; label: string; hint: string }[] = [
  { id: 'emailUpdates', label: 'تحديثات الطلبات بالبريد', hint: 'عند كل تغيّر في حالة طلبك أو قرار اللجنة' },
  { id: 'emailReceipts', label: 'إيصالات الدفع بالبريد', hint: 'نسخة من الإيصال بعد كل عملية دفع' },
];

/** تفضيلات التواصل. تُحفظ في هذا الجهاز حالياً، وتُربط بحساب المستخدم عند ربط الخادم. */
export function PreferencesCard() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // نستخدم القيم الافتراضية إذا تعذّر الوصول للتخزين
    }
    setReady(true);
  }, []);

  function toggle(id: keyof Preferences) {
    setPrefs((current) => {
      const next = { ...current, [id]: !current[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // تجاهل
      }
      return next;
    });
  }

  return (
    <Card as="section" padding={16} radius={20} gap={4}>
      <h2 className={styles.title}>تفضيلات التواصل</h2>
      {OPTIONS.map((o) => (
        <label key={o.id} className={styles.row}>
          <span className={styles.text}>
            <span className={styles.label}>{o.label}</span>
            <span className={styles.hint}>{o.hint}</span>
          </span>
          <input type="checkbox" role="switch" className={styles.switch} checked={prefs[o.id]} disabled={!ready} onChange={() => toggle(o.id)} />
        </label>
      ))}
    </Card>
  );
}
