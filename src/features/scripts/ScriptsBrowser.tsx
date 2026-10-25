'use client';

import { useMemo, useState } from 'react';
import { ROUTES } from '@/config/routes';
import { normalizeArabic } from '@/lib/text';
import type { Script, ScriptCategory } from '@/types';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { PageBody } from '@/components/layout/PageBody';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatePanel } from '@/components/ui/StatePanel';
import { ScriptCard } from './ScriptCard';
import styles from './ScriptsBrowser.module.css';

const TABS: { id: ScriptCategory; label: string }[] = [
  { id: 'drama', label: 'درامي' },
  { id: 'theatre', label: 'مسرحي' },
];

export function ScriptsBrowser({ scripts }: { scripts: Script[] }) {
  const [category, setCategory] = useState<ScriptCategory>('drama');
  const [query, setQuery] = useState('');

  const tabs = useMemo(
    () => TABS.map((t) => ({ ...t, label: `${t.label} (${scripts.filter((s) => s.category === t.id).length})` })),
    [scripts],
  );

  const visible = useMemo(() => {
    const q = normalizeArabic(query);
    return scripts.filter(
      (s) => s.category === category && (!q || normalizeArabic(s.title).includes(q) || normalizeArabic(s.author.name).includes(q)),
    );
  }, [scripts, category, query]);

  const trimmed = query.trim();

  return (
    <>
      <PageHeader
        start={<BackButton href={ROUTES.home} />}
        end={
          <span className={styles.count} aria-live="polite">
            {visible.length} نص مجاز
          </span>
        }
        title="النصوص المجازة"
      >
        <label className={styles.search}>
          <Icon name="search" size={18} strokeWidth={2} />
          <span className="visually-hidden">بحث</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="ابحث باسم النص أو المؤلف"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <SegmentedControl options={tabs} value={category} onChange={setCategory} label="تصنيف النصوص" />
      </PageHeader>

      <PageBody grid>
        {visible.map((script) => (
          <ScriptCard key={script.id} script={script} />
        ))}
        {visible.length === 0 && (
          <div data-span="full">
            <StatePanel
              boxed
              icon="searchEmpty"
              title="لا توجد نصوص مطابقة"
              description={
                trimmed
                  ? `لم نجد نصاً باسم أو مؤلف «${trimmed}» في هذا القسم. جرّب كلمة أخرى أو القسم الآخر.`
                  : 'لا توجد نصوص مجازة في هذا القسم بعد.'
              }
            >
              {trimmed && (
                <Button size="sm" onClick={() => setQuery('')}>
                  مسح البحث
                </Button>
              )}
            </StatePanel>
          </div>
        )}
      </PageBody>
    </>
  );
}
