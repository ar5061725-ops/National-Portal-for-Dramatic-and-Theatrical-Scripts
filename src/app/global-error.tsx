'use client';

/** شبكة أمان أخيرة: أي خطأ يتجاوز حدود الأخطاء الأخرى (حتى في التخطيط الجذري) يظهر بصفحة واضحة بدل شاشة بيضاء. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'sans-serif', display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 24, textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22 }}>حدث خطأ غير متوقع</h1>
          <p style={{ color: '#5b6b80', lineHeight: 1.8 }}>تعذّر عرض الصفحة. حاول مرة أخرى، وإن استمر الخطأ فتواصل مع الدعم.</p>
          <button type="button" onClick={reset} style={{ minHeight: 48, padding: '0 28px', borderRadius: 14, border: 0, background: '#125A95', color: '#fff', fontSize: 16, fontWeight: 700 }}>
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
