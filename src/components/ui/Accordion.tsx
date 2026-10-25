'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import styles from './Accordion.module.css';

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** القسم المفتوح مبدئياً */
  defaultOpenId?: string | null;
}

/** أكورديون بفتح قسم واحد في كل مرة. */
export function Accordion({ items, defaultOpenId = null }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);
  const baseId = useId();

  return (
    <div className={styles.root}>
      {items.map((item, index) => {
        const open = item.id === openId;
        const panelId = `${baseId}-${item.id}`;
        return (
          <section key={item.id} className={cn(styles.item, open && styles.open)}>
            <h2 className={styles.heading}>
              <button
                type="button"
                className={cn('pressable', styles.trigger)}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                <span className={styles.number}>{index + 1}</span>
                <span className={styles.title}>{item.title}</span>
                <Icon name="chevronDown" size={18} strokeWidth={2.2} className={cn(styles.chevron, open && styles.chevronOpen)} />
              </button>
            </h2>
            {open && (
              <div id={panelId} className={styles.panel}>
                {item.content}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
