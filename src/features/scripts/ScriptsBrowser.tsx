'use client';

import { useMemo, useState } from 'react';
import { ROUTES } from '@/config/routes';
import { normalizeArabic } from '@/lib/text';
import type { Script, ScriptCategory } from '@/types';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { PageBody } from '@/components/layout/PageBody';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
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
  const [genre, setGenre] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const tabs = useMemo(
    () => TABS.map((t) => ({ ...t, label: `${t.label} (${scripts.filter((s) => s.category === t.id).length})` })),
    [scripts],
  );

  /** التصنيفات المتاحة داخل القسم الحالي (تصفية بحسب التصنيف). */
  const genres = useMemo(
    () => Array.from(new Set(scripts.filter((s) => s.category === category).map((s) => s.genre))),
    [scripts, category],
  );

  const visible = useMemo(() => {
    const q = normalizeArabic(query);
    return scripts.filter(
      (s) =>
        s.category === category &&
        (!genre || s.genre === genre) &&
        (!q || normalizeArabic(s.title).includes(q) || normalizeArabic(s.author.name).includes(q)),
    );
  }, [scripts, category, genre, query]);

  const trimmed = query.trim();

  function changeCategory(next: ScriptCategory) {
    setCategory(next);
    setGenre(null);
  }

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
        <SegmentedControl options={tabs} value={category} onChange={changeCategory} label="تصنيف النصوص" />
      </PageHeader>

      <PageBody grid>
        {genres.length > 1 && (
          <div data-span="full" className={styles.genres} role="group" aria-label="التصفية بحسب التصنيف">
            <Chip pressed={genre === null} onClick={() => setGenre(null)}>
              الكل
            </Chip>
            {genres.map((g) => (
              <Chip key={g} pressed={genre === g} onClick={() => setGenre(g)}>
                {g}
              </Chip>
            ))}
          </div>
        )}

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
              {(trimmed || genre) && (
                <Button
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setGenre(null);
                  }}
                >
                  مسح البحث والتصفية
                </Button>
              )}
            </StatePanel>
          </div>
        )}
      </PageBody>
    </>
  );
}
