'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ROUTES } from '@/config/routes';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { StatePanel } from '@/components/ui/StatePanel';
import styles from './MemoViewer.module.css';

type Status = 'loading' | 'ready' | 'error';

function PageCanvas({ doc, pageNumber }: { doc: PDFDocumentProxy; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [aspect, setAspect] = useState(1.414);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // خارج الشاشة: نحرّر ذاكرة اللوحة (المذكرة 91 صفحة)
    if (!visible) {
      const el = canvasRef.current;
      if (el) {
        el.width = 1;
        el.height = 1;
      }
      return;
    }
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNumber);
      const canvas = canvasRef.current;
      const holder = holderRef.current;
      if (!canvas || !holder || cancelled) return;
      const base = page.getViewport({ scale: 1 });
      // دقة عالية ثابتة (عرض 1400 بكسل) لتبقى الحروف العربية واضحة
      const scale = Math.max(1400 / base.width, (holder.clientWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2));
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setAspect(viewport.height / viewport.width);
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, doc, pageNumber]);

  return (
    <div ref={holderRef} className={styles.page} style={{ aspectRatio: `1 / ${aspect}` }}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label={`صفحة ${pageNumber}`} />
    </div>
  );
}

/**
 * قارئ المذكرة للقراءة فقط: لوحات canvas بلا زر تحميل أو طباعة، وبعلامة مائية باسم القارئ.
 * تنبيه: لا توجد طريقة موثوقة في المتصفح لمنع تصوير الشاشة؛ هذه الإجراءات رادعة (تحجب المحتوى عند فقدان
 * التركيز، وتمنع القائمة والنسخ والطباعة) وتُظهر هوية القارئ على كل صفحة.
 */
export function MemoViewer({ watermark }: { watermark: string }) {
  const [status, setStatus] = useState<Status>('loading');
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const res = await fetch('/api/memo', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error('load');
      const data = new Uint8Array(await res.arrayBuffer());
      const loaded = await pdfjs.getDocument({ data }).promise;
      if (!cancelled) {
        setDoc(loaded);
        setStatus('ready');
      }
    })().catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c', 'u', 'a'].includes(k)) e.preventDefault();
      if (e.key === 'PrintScreen') void navigator.clipboard?.writeText('').catch(() => {});
    };
    const hide = () => setObscured(true);
    const show = () => setObscured(false);
    const onVisibility = () => (document.hidden ? hide() : show());
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('dragstart', block);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('dragstart', block);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
    };
  }, []);

  const marks = Array.from({ length: 24 }, (_, i) => i);

  return (
    <>
      <PageHeader rounded start={<BackButton href={ROUTES.memo} />} title="قراءة المذكرة" titleSize={22} subtitle="للقراءة فقط — لا تحميل ولا طباعة" />
      <PageBody gap={12}>
        {status === 'loading' && <StatePanel tone="loading" fill title="جارٍ تحميل المذكرة" />}
        {status === 'error' && <StatePanel tone="info" icon="alert" fill title="تعذّر تحميل المذكرة" description="تحقق من الاتصال وأعد المحاولة." />}
        {status === 'ready' && doc && (
          <div className={styles.reader} data-obscured={obscured || undefined}>
            <div className={styles.watermark} aria-hidden="true">
              {marks.map((i) => (
                <span key={i}>{watermark}</span>
              ))}
            </div>
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PageCanvas key={i + 1} doc={doc} pageNumber={i + 1} />
            ))}
            {obscured && <div className={styles.cover}>عُلّق العرض أثناء فقدان التركيز. ارجع إلى هذه النافذة للمتابعة.</div>}
          </div>
        )}
      </PageBody>
    </>
  );
}
