# 00 — النطاق والأدلة وخط الأساس

## النطاق المشمول

كل ملف متتبع في المستودع يخدم أو يؤثر مباشرة أو غير مباشرة في DSH أو التكامل المالي الذي يقدمه WLT إلى DSH، بما في ذلك:

- `services/dsh/**` و`services/wlt/**` فرونت وباكيند وقواعد بيانات وعقود واختبارات.
- `core/identity/**`, `core/workforce/**`, Platform Control وProviders عند تأثيرها في الهوية أو التهيئة أو الصلاحيات.
- `apps/control-panel`, `app-client`, `app-partner`, `app-captain`, `app-field`.
- `contracts/**`, `shared/**`, generated clients, Nx, TypeScript, Expo, Next, Docker.
- `.github/**`, `tools/**`, `infra/**`, `governance/**` ومصادر الحقيقة والبوابات.

## منهج الاستقصاء

1. تثبيت SHA الريموت قبل القراءة.
2. جرد `git ls-files` مع الحجم والأسطر وSHA-256 والملفات الصفرية والتطابقات.
3. استخراج TS/JS imports وGo imports وPackage dependencies.
4. استخراج HTTP routes وNext pages وربطها بالعقود والعملاء والأسطح.
5. البحث عن Legacy/Compatibility/Deprecated/Obsolete/Journey/Contract-only وTODO/FIXME.
6. مطابقة CI artifacts والوظائف الناجحة والفاشلة بنفس SHA.
7. فصل خمسة أصناف: فشل حالي، دين معماري، ملف غير ضروري، عنصر تاريخي محمي، نقطة غير مثبتة.

## خط الأساس المثبت

- Repository: `bthwani2-boop/bthwani-suite-next`.
- Branch: `smsm`.
- SHA: `09f7a33081cdf07792710271038098862e58fbef`.
- ملفات متتبعة: 3,605.
- توزيع رئيسي: `services=2201`, `tools=283`, `governance=260`, `core=255`, `apps=204`, `shared=178`, `infra=93`, `.github=24`.

## CI على الرأس المثبت

### ناجح

- CodeQL.
- DSH Database Contract.
- Backends وقواعد البيانات لـDSH وWLT وIdentity وWorkforce وPlatform Control وProviders.
- حراس العقود والمهاجرات والعملاء المولدين والمسارات والhandlers والdispatch.

### فاشل أو يحتاج تصنيفًا

- Node verification: تعارض TypeScript CLI/API واختبارات تربط الصحة بنصوص مصدر قديمة.
- Runtime proof: الخدمات تصل readiness، ثم `POST /workforce/field-agents` يعيد HTTP 500 عامًا.
- Gitleaks: 26 finding عبر 9,276 Commit؛ مزيج محتمل من أسرار تاريخية وقيم اختبارات.
- Static diagnostics: Knip actionable/stale config findings.
- Journey Gate: منظومة ثقيلة وغير مطلوبة، وفشلها ليس دليلًا كافيًا على فشل المنتج.

## حدود الإثبات

لم تُشغّل Production ولم تُقرأ telemetry إنتاجية ولم تُعدّل بيانات. السبب الداخلي الدقيق لـWorkforce 500 غير موجود في artifact. حالة أسرار GitHub وSonar vars غير قابلة للإثبات من الشجرة وحدها.
