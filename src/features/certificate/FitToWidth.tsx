'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './FitToWidth.module.css';

interface FitToWidthProps {
  designWidth: number;
  designHeight: number;
  children: ReactNode;
}

/**
 * يعرض تصميماً بمقاس ثابت (A4 أفقي) مصغّراً ليتسع لعرض الشاشة.
 * عند الطباعة يعود المقاس الأصلي بفضل قواعد @media print في الـ CSS.
 */
export function FitToWidth({ designWidth, designHeight, children }: FitToWidthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / designWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [designWidth]);

  return (
    <div ref={containerRef} className={styles.container} style={{ height: designHeight * scale }}>
      <div className={styles.stage} style={{ width: designWidth, height: designHeight, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
