# تشغيل التطبيقات محليًا

هذا المستودع يستخدم مشغلات حاكمة ثابتة. لا تشغّل Expo أو Next مباشرة، ولا تغيّر المنافذ، ولا تضبط عنوان الراوتر يدويًا.

## المتطلبات

1. شغّل الخدمات المحلية المطلوبة من جذر المستودع:

```powershell
pnpm runtime:full:up
pnpm runtime:full:smoke
```

2. تأكد أن الهاتف ظاهر بحالة `device` في ADB. عند وجود USB وWi-Fi معًا يختار المشغّل USB افتراضيًا للاستقرار. لتحديد اتصال بعينه:

```powershell
$env:BTHWANI_ANDROID_SERIAL = "192.168.0.104:5555"
```

أو لاختيار نوع النقل دون تثبيت serial:

```powershell
$env:BTHWANI_ANDROID_TRANSPORT = "tcp" # auto | usb | tcp
```

## أوامر التطبيقات

| التطبيق | الأمر | المنفذ الثابت |
|---|---|---:|
| العميل | `pnpm client` | 18101 |
| الشريك | `pnpm partner` | 18102 |
| الكابتن | `pnpm captain` | 18103 |
| الميدان | `pnpm field` | 18104 |
| لوحة التحكم | `pnpm control` | 13000 |

المشغّل المحمول ينفذ تلقائيًا ما يلي:

- يثبت منفذ Metro ويرفض التشغيل برسالة واضحة إذا كان مستخدمًا بدل الانتقال إلى منفذ آخر.
- يختار جهاز ADB وفق `BTHWANI_ANDROID_SERIAL` أو `BTHWANI_ANDROID_TRANSPORT`.
- ينشئ ويتحقق من `adb reverse` لمنافذ Metro والخدمات المحلية.
- يعلن لتطبيق DSH أن loopback صالح فقط بعد نجاح جسور ADB.
- يشغّل Expo بوضع dev client عبر localhost، ولذلك لا يعتمد على IP الراوتر أو حالة VPN.

لوحة التحكم تستخدم same-origin BFF عبر `/api/*`. عناوين الخدمات المباشرة تبقى في بيئة Next server ولا تُكشف كاتصال مباشر من المتصفح.

## الخيارات التشغيلية

مسح Metro cache عند الحاجة فقط:

```powershell
$env:BTHWANI_METRO_CLEAR = "1"
pnpm client
```

فتح scrcpy مع التطبيق:

```powershell
$env:BTHWANI_MIRROR_DEVICE = "1"
pnpm captain
```

مراقب Wi-Fi ADB اختياري ومتوقف افتراضيًا. عند تفعيله يصلح خرائط reverse المفقودة فقط ولا ينفذ `adb disconnect` أو `adb connect`:

```powershell
$env:BTHWANI_ADB_WATCHDOG = "reverse"
pnpm field
```

لإعادة تطبيق جميع الخرائط يدويًا دون تشغيل تطبيق:

```powershell
pnpm reverse
```
