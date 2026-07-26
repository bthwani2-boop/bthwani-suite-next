# بنية الإنتاج لبثواني — وثيقة معمارية (Documentation-Only)

**الغرض:** توثيق الفجوة بين الـ Runtime المحلي الحالي وبين ما تتطلبه بيئة الإنتاج، ووضع مقترح بنية إنتاج قابل للتنفيذ لاحقًا.
**لا يُعلن هذا الملف أن الإنتاج منشور أو جاهز.** هو يغلق البند رقم 1 من
`tools/plan/BTHWANI_FINAL_CLOSURE_DECISION_REGISTER_ONEBYONE.md` على مستوى **التوثيق** فقط؛ البند نفسه يبقى
`BLOCKED_EXTERNAL` لأن قرار منصة الاستضافة يعود للمالك.

**مرجع البند المُغلق توثيقيًا:** القسم "1. [P0] بيئة الإنتاج الفعلية"، من نفس ملف السجل، الأسطر ~119–138.
**مرجع تعريف الإغلاق:** القسم 2 من نفس الملف (`final_closure_target: STORE_SUBMISSION_READY`،
`required_environments.production: true`، `forbidden_in_release` يشمل `localhost endpoints` و`default credentials`).

---

## 1) الحقيقة الحالية (Local Runtime — دليل من الكود)

الملف الحاكم لكل تشغيل محلي هو `infra/docker/compose.runtime.yml`. سياسته معلنة صراحة في أعلى الملف
(`x-bthwani-policy`) وتمنع استخدام أي compose بديل (`compose.local.yml`, `compose.full.yml`, `compose.slice.yml`,
أو compose لكل رحلة على حدة).

```yaml
local_runtime_truth:
  source: "infra/docker/compose.runtime.yml"
  status: LOCAL_ONLY
  evidence:
    - "كل port binding في الملف مربوط بـ 127.0.0.1 فقط: postgres (127.0.0.1:55432), minio (127.0.0.1:59000/59001), identity-api (127.0.0.1:58082), workforce-api (127.0.0.1:58086), wlt-api (127.0.0.1:58083), dsh-api (127.0.0.1:58080)"
    - "أسرار افتراضية ظاهرة في infra/docker/env/runtime.env.example: BTHWANI_POSTGRES_PASSWORD=bthwani_runtime_password, BTHWANI_MINIO_ROOT_PASSWORD=bthwani_minio_password, IDENTITY_ACTIVATION_HMAC_SECRET=LOCAL_ONLY_replace_with_...، WLT_DSH_SERVICE_TOKEN=dev-only-dsh-wlt-shared-secret"
    - "IDENTITY_LOCAL_BOOTSTRAP: افتراضيًا true مع كلمة مرور bootstrap ثابتة (123456) في compose.runtime.yml"
    - "MinIO محلي (minio/minio image) بدلاً من object storage مُدار، وبكت private افتراضيًا حسب نفس x-bthwani-policy"
    - "المزود المالي في WLT هو wiremock mock: WLT_FINANCIAL_PROVIDER_MODE=mock, WLT_FINANCIAL_PROVIDER_BASE_URL=http://wiremock-financial-provider:8080 (يُشغَّل عبر infra/docker/compose.financial-simulators.yml, profile: financial-simulators)"
    - "WLT_ALLOW_PRODUCTION_PROVIDER=false افتراضيًا، وWLT_MUTATIONS_ENABLED=false افتراضيًا"
  explicit_conclusion: >
    هذا التشكيل هو Runtime تطوير محلي (dev/e2e) فقط، وليس تعريفًا للإنتاج، ولا يجوز اعتباره دليل نشر.
    وجود كل العناصر أعلاه يطابق حرفيًا بنود forbidden_in_release في تعريف الإغلاق: localhost endpoints,
    default credentials, local bootstrap, development-only providers.
verification_command: >
  رجوع مباشر إلى infra/docker/compose.runtime.yml (أسطر 1-15 لسياسة x-bthwani-policy، وكل service block لبيان
  127.0.0.1 binding)، و infra/docker/env/runtime.env.example لسطور الأسرار الافتراضية، و
  infra/docker/compose.financial-simulators.yml لخدمة wiremock-financial-provider.
```

---

## 2) البيئات الثلاث المطلوبة (local / staging / production)

تعريف الإغلاق النهائي (القسم 2 من ملف السجل) يشترط `required_environments: {local: true, staging: true, production: true}`.
الكود اليوم يغطي `local` فقط بدليل تشغيلي. `staging` و`production` غير موجودين كتعريف بنية اليوم — هذه الوثيقة تقترح
الفصل ولا تدّعي أنه منفَّذ.

```yaml
environment_separation_proposal:
  local:
    status: EXISTS_TODAY
    evidence: "infra/docker/compose.runtime.yml + infra/docker/compose.financial-simulators.yml"
    financial_provider: mock (wiremock) — مسموح
    bindings: 127.0.0.1 only
    secrets: defaults من env.example — مقبول محليًا فقط

  staging:
    status: NOT_YET_DEFINED_PROPOSED
    financial_provider: mock (wiremock) مسموح، أو sandbox حقيقي لمزود الدفع إن توفر من المالك
    bindings: نطاقات داخلية/VPN، ليست 127.0.0.1، لكن ليست عامة بالضرورة
    secrets: يجب أن تُحقن من secret manager وليس من ملف env افتراضي، حتى في staging
    purpose: E2E حقيقي قبل الإنتاج، تحقق CI على SHA واحد (حسب governance/.../07_VERIFICATION_RUNTIME_CI_PR.md)

  production:
    status: NOT_YET_DEFINED_BLOCKED_EXTERNAL
    financial_provider: >
      يُمنع mock. التبديل يتم فقط عبر متغيرات بيئة موجودة فعليًا في الكود اليوم:
      WLT_FINANCIAL_PROVIDER_MODE (يجب أن يكون قيمة مزود حقيقي وليس "mock") و
      WLT_ALLOW_PRODUCTION_PROVIDER=true. هذا التبديل env-only، بلا حاجة لتغيير كود WLT.
    bindings: نطاقات عامة خلف TLS termination، لا يوجد أي 127.0.0.1 binding
    secrets: secret manager إلزامي، لا قيم افتراضية، فشل البناء عند اكتشاف سر افتراضي (انظر القسم 3)

production_provider_switch_contract:
  variables:
    - WLT_FINANCIAL_PROVIDER_MODE   # قيمة غير "mock" في production
    - WLT_ALLOW_PRODUCTION_PROVIDER # "true" في production فقط
  code_evidence: "infra/docker/compose.runtime.yml, service wlt-api, أسطر environment"
  claim: "قابلية التبديل موجودة في الكود اليوم؛ اختيار المزود الفعلي ونطاق WLT النهائي = قرار مالك (انظر البند 2 من سجل الإغلاق)"
```

---

## 3) بنية الإنتاج المقترحة (اقتراح غير منفَّذ)

هذا اقتراح معماري فقط، لا يوجد أي تنفيذ له في الفرع الحالي.

```yaml
proposed_production_architecture:
  edge:
    component: reverse_proxy_with_tls_termination
    requirement: "كل نطاق عام (identity/workforce/dsh/wlt/control-panel) خلف TLS، لا اتصال HTTP مباشر بالحاويات"
    open_decision: "اختيار المزود/المنتج (BLOCKED_EXTERNAL)"

  database:
    component: managed_postgres
    requirement:
      - "بديل production لخدمة postgres المحلية في compose.runtime.yml (التي تستخدم postgres:16-alpine بلا إدارة)"
      - "نسخ احتياطي مشفر آلي (automated encrypted backups)"
      - "تجربة استعادة ربع سنوية (quarterly restore drill) موثقة بنتيجة PASS/FAIL"
      - "RPO/RTO يحددهما المالك حسب SLA العمل، لا يُفترضان هنا"
    open_decision: "اختيار مزود Postgres المُدار (BLOCKED_EXTERNAL)"

  object_storage:
    component: s3_compatible_managed_storage
    replaces: "minio المحلي في compose.runtime.yml (bucket dsh-media، DSH_MINIO_* env vars)"
    requirement: "نفس عقد API (S3-compatible) حتى يبقى كود DSH بدون تغيير منطقي، فقط تبديل endpoint/credentials"
    open_decision: "اختيار المزود (AWS S3 / Cloudflare R2 / غيره) — BLOCKED_EXTERNAL"

  secrets:
    component: secret_manager
    requirement:
      - "منع أي قيمة افتراضية ضعيفة (مطابقة لما هو موجود اليوم في runtime.env.example) من الوصول إلى إنتاج"
      - "فشل البناء/النشر (build fails) عند اكتشاف سر مطابق للقيم الافتراضية المعروفة في env.example"
      - "لا NUL secrets، لا log لأي قيمة سر"
    open_decision: "اختيار أداة إدارة الأسرار (Vault/AWS Secrets Manager/غيره) — BLOCKED_EXTERNAL"

  observability:
    component: logs_metrics_alerts
    requirement:
      - "تجميع مركزي للـ logs من كل خدمة (identity/workforce/dsh/wlt)"
      - "مقاييس health مبنية على health endpoints الموجودة فعليًا: /identity/health, /workforce/health, /dsh/health, /wlt/health"
      - "تنبيهات عند فشل healthcheck أو ارتفاع معدل الأخطاء"
    open_decision: "اختيار منصة المراقبة — BLOCKED_EXTERNAL"

  deployment_policy:
    component: staged_rollout_with_rollback
    requirement:
      - "صور Docker مُعرَّفة بـ exact-SHA (لا latest، لا tag متحرك) اتساقًا مع اشتراط 'exact-SHA CI evidence' في تعريف الإغلاق"
      - "نشر تدريجي (staged rollout): staging ثم production"
      - "خطة rollback فورية لكل خدمة عبر إعادة نشر SHA سابق"
    open_decision: "منصة orchestration/CI-CD النهائية — BLOCKED_EXTERNAL"
```

---

## 4) مصفوفة `docker_hosting_runtime_matrix` (حسب الملف 10 من البروتوكول)

| الخدمة | Local (اليوم — دليل) | Staging (مخطط) | Production (مخطط / BLOCKED_EXTERNAL) |
|---|---|---|---|
| identity-api | `compose.runtime.yml` service `identity-api`, بورت 127.0.0.1:58082, `IDENTITY_LOCAL_BOOTSTRAP=true` | نطاق داخلي، bootstrap معطّل، أسرار من secret manager | نطاق عام خلف TLS، لا bootstrap، سر HMAC من secret manager — BLOCKED_EXTERNAL |
| workforce-api | `compose.runtime.yml` service `workforce-api`, بورت 127.0.0.1:58086 | نطاق داخلي، service token من secret manager | نطاق عام خلف TLS — BLOCKED_EXTERNAL |
| dsh-api | `compose.runtime.yml` service `dsh-api`, بورت 127.0.0.1:58080, يعتمد MinIO محلي | نطاق داخلي + object storage staging | نطاق عام خلف TLS + S3-compatible managed storage — BLOCKED_EXTERNAL |
| wlt-api | `compose.runtime.yml` service `wlt-api`, بورت 127.0.0.1:58083, `WLT_FINANCIAL_PROVIDER_MODE=mock` | mock مسموح أو sandbox حقيقي إن توفر | `WLT_FINANCIAL_PROVIDER_MODE=<real>` و`WLT_ALLOW_PRODUCTION_PROVIDER=true` إلزاميًا — BLOCKED_EXTERNAL (اختيار المزود) |
| مزود مالي (financial provider) | `compose.financial-simulators.yml` service `wiremock-financial-provider` (mock, profile `financial-simulators`) | mock أو sandbox حقيقي | مزود دفع حقيقي معتمد — BLOCKED_EXTERNAL |
| storage (media) | `compose.runtime.yml` service `minio`, بورت 127.0.0.1:59000/59001, بكت `dsh-media` | object storage staging مُدار | S3-compatible managed storage — BLOCKED_EXTERNAL |
| db (postgres) | `compose.runtime.yml` service `postgres`, بورت 127.0.0.1:55432, صورة `postgres:16-alpine`, بلا backups آلية موثقة | managed Postgres instance (staging tier) | managed Postgres + automated encrypted backups + quarterly restore drills — BLOCKED_EXTERNAL (اختيار المزود) |

```yaml
docker_hosting_runtime_matrix:
  docker:
    affected: true
    compose_files:
      - infra/docker/compose.runtime.yml
      - infra/docker/compose.financial-simulators.yml
    dockerfiles:
      - core/identity/backend/Dockerfile
      - core/workforce/backend/Dockerfile
      - services/wlt/backend/Dockerfile
      - services/dsh/backend/Dockerfile
    services: [postgres, minio, identity-api, workforce-api, wlt-api, dsh-api, wiremock-financial-provider]
    ports: "كل الخدمات مربوطة 127.0.0.1:* محليًا (انظر القسم 1)"
    volumes: [bthwani-postgres-runtime-data, bthwani-minio-runtime-data]
    networks: [bthwani-runtime]
    env_files: [infra/docker/env/runtime.env.example]
    healthchecks: "موجودة لكل خدمة (pg_isready, wget health endpoints, minio live check)"
    verification_command: "قراءة مباشرة لكل ملف compose أعلاه — لا تشغيل مطلوب لهذه الوثيقة"
  database_container:
    affected: true
    image: "postgres:16-alpine"
    port_mapping: "127.0.0.1:55432:5432"
    status: LOCAL_ONLY_NO_MANAGED_EQUIVALENT_YET
  hosting_platform_for_production:
    affected: true
    status: BLOCKED_EXTERNAL
    reason: "قرار منصة استضافة/سحابة تجاري يعود للمالك، لا يجوز افتراضه من الكود"
```

---

## 5) ما يحسمه الريبو مقابل ما يحتاج قرار مالك خارجي

```yaml
repo_can_decide_or_already_provides:
  - "فصل local/staging/production كمبدأ معماري (هذه الوثيقة)"
  - "آلية التبديل env-only بين mock وreal provider في WLT (WLT_FINANCIAL_PROVIDER_MODE + WLT_ALLOW_PRODUCTION_PROVIDER)"
  - "health endpoints جاهزة للمراقبة (/identity/health, /workforce/health, /dsh/health, /wlt/health)"
  - "عقد S3-compatible API في DSH (لا حاجة لتغيير كود عند تبديل مزود التخزين)"
  - "منع compose files بديلة (سياسة x-bthwani-policy)"

owner_must_decide_blocked_external:
  - item: "منصة الاستضافة/السحابة (Cloud/hosting platform)"
    status: BLOCKED_EXTERNAL
  - item: "النطاقات العامة (public domains) لكل سطح"
    status: BLOCKED_EXTERNAL
  - item: "شهادات TLS ومزود إصدارها"
    status: BLOCKED_EXTERNAL
  - item: "اختيار مزود Postgres المُدار وسياسة النسخ الاحتياطي/RPO/RTO"
    status: BLOCKED_EXTERNAL
  - item: "اختيار أداة إدارة الأسرار (secret manager)"
    status: BLOCKED_EXTERNAL
  - item: "مزود الدفع الحقيقي (real payment provider) — مرتبط أيضًا بالبند 2 من سجل الإغلاق"
    status: BLOCKED_EXTERNAL
  - item: "مزود SMS حقيقي للتفعيل/OTP في الإنتاج"
    status: BLOCKED_EXTERNAL
  - item: "حسابات Apple Developer و Google Play Console"
    status: BLOCKED_EXTERNAL
  - item: "منصة orchestration/CI-CD للنشر التدريجي والـ rollback"
    status: BLOCKED_EXTERNAL
  - item: "منصة المراقبة (observability platform)"
    status: BLOCKED_EXTERNAL
```

---

## 6) حالة البند

```yaml
register_item_reference: "tools/plan/BTHWANI_FINAL_CLOSURE_DECISION_REGISTER_ONEBYONE.md — البند 1 [P0] بيئة الإنتاج الفعلية"
register_item_1_status: DOCUMENTED_ARCHITECTURE_PENDING_OWNER_HOSTING_DECISION
production_claimed: false
production_deployed: false
closure_level: DOCUMENTATION_ONLY
remaining_blocker: >
  اختيار منصة الاستضافة، النطاقات، شهادات TLS، مزود قاعدة البيانات المُدارة، أداة إدارة الأسرار، مزود الدفع
  الحقيقي، ومزود SMS — كلها قرارات مالك خارجي (BLOCKED_EXTERNAL) ولا يمكن للكود حسمها.
next_step_when_owner_decides: >
  تحويل كل صف "مخطط/Proposed" في مصفوفة القسم 4 إلى compose/Dockerfile/CI فعلي تحت staging ثم production،
  مع تحقق exact-SHA وE2E حقيقي قبل أي ادعاء STORE_SUBMISSION_READY.
```
