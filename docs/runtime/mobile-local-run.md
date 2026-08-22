# تشغيل التطبيقات محليًا

هذا المستودع يستخدم مشغلات حاكمة ثابتة. لا تشغّل Expo أو Next مباشرة، ولا تغيّر المنافذ، ولا تضبط عنوان الراوتر يدويًا.

## المتطلبات

1. شغّل الخدمات المحلية المطلوبة من جذر المستودع:

```powershell
pnpm runtime:full:up
pnpm runtime:full:smoke
```

2. نقل التطبيقات المحمولة مستقل عن أدوات عرض شاشة الهاتف. الوضع الافتراضي `auto` يحاول LAN أولًا ثم يستخدم ADB كـ fallback على Android عند تعذر LAN. ويمكن تثبيت النقل صراحة:

```powershell
$env:BTHWANI_MOBILE_TRANSPORT = "auto" # auto | lan | adb
```

عند استخدام ADB، تأكد أن الهاتف ظاهر بحالة `device` في `adb devices`. عند وجود USB وWi-Fi معًا يختار المشغّل USB افتراضيًا للاستقرار. لتحديد اتصال بعينه استخدم serial الفعلي الذي يعرضه `adb devices`، مثل:

```powershell
$env:BTHWANI_ANDROID_SERIAL = "<DEVICE_SERIAL>"
```

أو لاختيار نوع اتصال Android دون تثبيت serial:

```powershell
$env:BTHWANI_ANDROID_TRANSPORT = "usb" # auto | usb | tcp
```

## أوامر التطبيقات

| التطبيق | الأمر | المنفذ الثابت |
|---|---|---:|
| العميل | `pnpm client` | 18101 |
| الشريك | `pnpm partner` | 18102 |
| الكابتن | `pnpm captain` | 18103 |
| الميدان | `pnpm field` | 18104 |
| لوحة التحكم | `pnpm control` | 13000 |

`pnpm control` يقرأ bundle `controlPanelDevelopment` من عقد الجاهزية، ويشغّل الـruntime الرسمي تلقائيًا عند عدم جاهزية أي خدمة. لتعطيل هذا التشغيل التلقائي مع إبقاء الفشل المغلق استخدم `BTHWANI_AUTO_START_BACKEND=false`.

المشغّل المحمول ينفذ تلقائيًا ما يلي:

- يثبت منفذ Metro ويرفض التشغيل برسالة واضحة إذا كان مستخدمًا بدل الانتقال إلى منفذ آخر.
- يحسم النقل `lan` أو `adb` وفق `BTHWANI_MOBILE_TRANSPORT` وسياسة المنصة.
- في LAN يشغّل Metro عبر `--lan` ويستخدم بوابة التطوير المحلية الحاكمة، ولا يعتمد على ADB.
- في ADB يختار الجهاز وفق `BTHWANI_ANDROID_SERIAL` أو `BTHWANI_ANDROID_TRANSPORT`، وينشئ ويتحقق من `adb reverse` لمنافذ Metro والخدمات المحلية.
- في ADB يفتح Dev Client على الجهاز تلقائيًا بعد أن يصبح Metro جاهزًا.
- لا يبحث عن `scrcpy` ولا يشغّله ولا يعتبر وجوده شرطًا لنجاح أي تطبيق.

لوحة التحكم تستخدم same-origin BFF عبر `/api/*`. عناوين الخدمات المباشرة تبقى في بيئة Next server ولا تُكشف كاتصال مباشر من المتصفح.

## الخيارات التشغيلية

مسح Metro cache عند الحاجة فقط:

```powershell
$env:BTHWANI_METRO_CLEAR = "1"
pnpm client
```

مرآة شاشة Android مستقلة تمامًا عن تشغيل التطبيقات. شغّلها في طرفية منفصلة عند الحاجة فقط:

```powershell
scrcpy -s <DEVICE_SERIAL>
```

لا تستخدم `BTHWANI_MIRROR_DEVICE`; لم تعد المرآة جزءًا من عقد `pnpm client` أو `pnpm partner` أو `pnpm captain` أو `pnpm field`.

مراقب Wi-Fi ADB اختياري ومتوقف افتراضيًا. عند تفعيله يصلح خرائط reverse المفقودة فقط ولا ينفذ `adb disconnect` أو `adb connect`:

```powershell
$env:BTHWANI_ADB_WATCHDOG = "reverse"
pnpm field
```

لإعادة تطبيق جميع الخرائط يدويًا دون تشغيل تطبيق:

```powershell
pnpm reverse
```
