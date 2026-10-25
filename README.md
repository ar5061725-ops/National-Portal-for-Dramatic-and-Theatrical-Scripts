# البوابة الوطنية للنصوص الدرامية والمسرحية

تحويل النسخة التجريبية (HTML) إلى تطبيق **Next.js 15** (App Router) بـ **TypeScript**.

## التشغيل

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # فحص الأنواع
npm run build && npm start
```

يتطلب Node.js 18.18 أو أحدث. الخطوط (IBM Plex Sans Arabic وReem Kufi وAmiri) تُحمَّل عبر `next/font` وقت البناء.

## هيكل المشروع

```
src/
├─ app/                    المسارات فقط (صفحات رفيعة تجلب البيانات وتستدعي feature)
│  ├─ (tabs)/              صفحات بشريط تنقل سفلي: home, scripts, requests, profile
│  ├─ (flow)/              تدفقات بلا شريط: splash, login, submit, payment, committee,
│  │                       notifications, receipts, terms, scripts/[id],
│  │                       requests/[id]/feedback, certificate/[id]
│  ├─ (print)/             certificate/[id]/print (A4 أفقي، بلا إطار التطبيق)
│  └─ layout.tsx · not-found.tsx · globals.css (متغيرات التصميم)
├─ components/
│  ├─ ui/                  لبنات عامة قابلة لإعادة الاستخدام (Button, Card, Badge, TextField,
│  │                       StarRating, StatePanel, Accordion, Stepper, Skeleton…)
│  ├─ layout/              AppShell, PageHeader, PageBody, BottomNav, FormSection
│  └─ feedback/            PageSkeleton (التحميل) و RouteError (الأخطاء)
├─ features/               مكوّنات كل شاشة (scripts, requests, submit, payment, committee…)
├─ providers/              ToastProvider, SubmissionProvider (مسودة التقديم)
├─ hooks/                  useAsyncAction (idle/loading/success/error)
├─ lib/api/                طبقة البيانات (حالياً بيانات تجريبية بتأخير شبكة محاكى)
├─ config/ · content/      الثوابت والمسارات والنصوص الثابتة
└─ types/                  الأنواع المشتركة
```

## القرارات الأساسية

- **إعادة الاستخدام:** كل ما تكرر في الشاشات الـ16 (الترويسة، الأزرار، البطاقات، الشارات، النجوم، الحقول، الحالات الفارغة والناجحة) صار مكوّناً واحداً.
- **الهاتف أولاً:** التصميم الأساسي للشاشات الضيقة (عرض كامل، أهداف لمس ≥ 44px، خط حقول 16px لمنع تكبير iOS، مراعاة `safe-area`). يتوسع الإطار عند 600px و960px، وتتحول القوائم إلى عمودين على الشاشات العريضة. شاشة الطباعة تتصغّر لتناسب العرض وتعود A4 عند الطباعة.
- **إدارة الحالة:**
  - بيانات الخادم تُجلب في Server Components (`app/**/page.tsx`).
  - حالة الواجهة المحلية (تبويب، بحث، اختيارات) بـ `useState` داخل مكوّنات العميل.
  - مسودة التقديم المشتركة بين صفحتي التقديم والدفع في `SubmissionProvider` (`useReducer` + `sessionStorage`).
  - كل العمليات غير المتزامنة (دخول، دفع، رد على اللجنة، اعتماد قرار) تمر عبر `useAsyncAction` بحالات موحدة.
- **التحميل والأخطاء:** `loading.tsx` يعرض هيكلاً (Skeleton) لكل مجموعة مسارات، و`error.tsx` يعرض `ErrorState` مع «إعادة المحاولة»، و`not-found.tsx` للروابط غير الصالحة، وكل نموذج يعرض رسالة خطأ وزر تحميل أثناء الإرسال. رفع الملفات يتحقق من النوع (PDF) والحجم (≤ 20MB).
- **قابلية التوسع:** كل ملف في `lib/api/` يمثل نطاقاً واحداً؛ استبدال محتواه بـ `fetch` لخادم حقيقي لا يمس الواجهة. القيم التي لم تحددها الوزارة (الرسوم، التواريخ، أرقام الإجازة…) مجمعة في `config/site.ts › PLACEHOLDERS`.

## الفروقات عن النسخة التجريبية

| الأصل | هنا |
|---|---|
| إطار iframe بمقاس جوال ثابت 390×844 | تخطيط متجاوب حقيقي بروابط مباشرة لكل صفحة |
| تفاصيل النص ثابتة لنص واحد | `/scripts/[id]` حسب النص المختار |
| الدخول وتقديم النموذج بروابط مباشرة | تحقق من الحقول ورسائل خطأ قبل المتابعة |
| ملاحظات اللجنة لطلب واحد | `/requests/[id]/feedback` |
| إيماءة السحب من الحافة للرجوع | محذوفة (المتصفح والنظام يوفرانها) |

## ما بقي للربط الفعلي

- مصادقة حقيقية وحماية المسارات (لوحة اللجنة والحساب حالياً مفتوحة).
- رفع الملفات إلى خادم/تخزين (الآن تُحفظ أسماؤها فقط).
- بوابة دفع حقيقية، وتوليد PDF للشهادة والإيصال، ورمز QR للتحقق.
- فتح المرفقات وتحميلها (حالياً تنبيهات مؤقتة).
