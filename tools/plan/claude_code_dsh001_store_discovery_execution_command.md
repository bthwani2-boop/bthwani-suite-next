# Claude Code Execution Command — DSH-001 Store Discovery

> الصق هذا الأمر كاملًا في Claude Code داخل المستودع الجديد فقط.
> الهدف: تنفيذ الشريحة الأولى `DSH-001 Store Discovery` تنفيذًا حيًا Full-Stack قابلًا للاختبار عبر Docker، مع تحليل المانح والجديد، وتجهيز ملف الشريحة، ثم تنفيذ العقد والدومين والقاعدة والباكند والعميل والواجهة والأدلة.
> لا تعلن اكتمالًا أو “100%” إلا إذا تحققت كل أدلة الإغلاق المذكورة في هذا الأمر فعليًا.

---

## 0) الدور والنطاق

أنت وكيل تنفيذ هندسي داخل المستودع الجديد:

```text
C:\bthwani-suite-next
```

نفّذ شريحة:

```text
DSH-001 Store Discovery
```

بمنهجية:

```text
GitHub-verified -> Local-verified -> Donor-readonly-analysis -> Machine-readable-audit -> Slice-plan -> Contract -> Domain -> Database -> Backend -> Docker -> Generated Client -> Shared Frontend -> App-client UI -> Live Testing -> Evidence -> Closure
```

ممنوع أن يكون الناتج تقريرًا فقط. المطلوب تنفيذ حقيقي في الكود الحي داخل المستودع الجديد، مع أدلة تشغيلية قابلة للمراجعة.

---

## 1) المستودعات والمسارات

### 1.1 المستودع الجديد — الهدف الوحيد للتعديل

```text
GitHub: bthwani2-boop/bthwani-suite-next
Local:  C:\bthwani-suite-next
Branch: starting-implementing-slices
```

### 1.2 المستودع المانح — قراءة/استخراج فقط

```text
GitHub: bthwani2-boop/bthwani-suite
Local:  C:\bthwani-suite
Branch: realtest

Donor paths:
C:\bthwani-suite\ui-kit
C:\bthwani-suite\wlt
C:\bthwani-suite\dsh
```

### 1.3 ممنوعات مطلقة

```text
- لا تعدّل C:\bthwani-suite نهائيًا.
- لا تنسخ ملفات donor كاملة.
- لا تنسخ أسماء donor containers / networks / volumes / ports.
- لا تستخدم bthwani-suite-local.
- لا تستخدم bthwani-local.
- لا تستخدم bthwani-dsh-api-local.
- لا تستخدم bthwani-wlt-api-local.
- لا تستخدم bthwani-dsh-postgres-local.
- لا تستخدم bthwani-wlt-postgres-local.
- لا تستخدم Mongo في DSH-001.
- لا تستخدم Redis في DSH-001.
- لا تستخدم preview/demo/mock runtime data.
- لا تستخدم fake actor IDs.
- لا تنقل منطق WLT المالي إلى DSH.
- لا تفعّل WLT runtime داخل DSH-001.
- لا تبدأ من الشاشة قبل OpenAPI.
- لا تغيّر guard ليقبل الفشل.
- لا تحذف guard لإخفاء الفشل.
```

---

## 2) بوابة ما قبل التنفيذ

ابدأ بهذه الأوامر ولا تتجاوز أي فشل:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$ErrorActionPreference = "Stop"

git branch --show-current
git remote -v
git fetch origin
git status --short
git log -1 --oneline
```

يجب أن يكون الفرع:

```text
starting-implementing-slices
```

إن لم يكن كذلك:

```powershell
git switch "starting-implementing-slices"
```

ثم تحقق من أن الفرع موجود على GitHub:

```powershell
git ls-remote --heads origin "starting-implementing-slices"
```

ثم شغّل البوابات الأساسية:

```powershell
git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check failed" }

pnpm run foundation:gate
if ($LASTEXITCODE -ne 0) { throw "foundation:gate failed" }

pnpm run docker:runtime:smoke
if ($LASTEXITCODE -ne 0) { throw "docker:runtime:smoke failed" }

pnpm run contracts:lint
if ($LASTEXITCODE -ne 0) { throw "contracts:lint failed" }

pnpm run guard:matrix:v3
if ($LASTEXITCODE -ne 0) { throw "guard:matrix:v3 failed" }

node .\tools\guards\docker-runtime-profiles.mjs
if ($LASTEXITCODE -ne 0) { throw "docker-runtime-profiles failed" }
```

لا تبدأ تنفيذ DSH-001 إذا فشل أي أمر.

---

## 3) تشخيص GitHub والمحلي الإلزامي

افحص الملفات التالية من GitHub/local قبل التنفيذ، ولا تعتمد على الذاكرة:

```text
package.json
pnpm-workspace.yaml
nx.json
infra/docker/compose.runtime.yml
infra/docker/env/runtime.env.example
infra/docker/runtime-profiles/00_RUNTIME_PROFILE_INDEX.md
infra/docker/runtime-profiles/dsh.runtime-profile.json
infra/docker/runtime-profiles/wlt.runtime-profile.json
infra/docker/runtime-profiles/identity.runtime-profile.json
infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json
tools/guards/guard-manifest.json
tools/guards/docker-runtime-profiles.mjs
services/dsh/service.manifest.ts
services/dsh/capability-map.ts
services/dsh/surface-map.ts
services/dsh/runtime-map.ts
services/dsh/contracts/dsh.openapi.yaml
services/dsh/package.json
services/wlt/service.manifest.ts
shared/ui-kit/**
apps/app-client/runtime/**
machine-readable/**
```

ثبّت هذه القرارات قبل التنفيذ:

```text
1. DSH-001 = Store Discovery.
2. التنفيذ يبدأ من OpenAPI.
3. app-client هو السطح الأساسي داخل DSH-001.
4. control-panel خارج DSH-001، ويصبح DSH-001B أو شريحة لاحقة.
5. partner/captain/field خارج DSH-001.
6. WLT runtime خارج DSH-001.
7. DSH لا يملك financial truth.
8. Docker حاضر ومفروض، لكن dsh-api لا يُفعّل إلا بعد runtime حقيقي.
9. machine-readable ليس مصدر ثقة تلقائيًا؛ يجب تدقيقه.
10. donor مرجع تصميم/منطق/حدود فقط، وليس مصدر نسخ.
```

أنشئ دليل الشريحة من البداية:

```powershell
New-Item -ItemType Directory -Force -Path ".\services\dsh\evidence\DSH-001-store-discovery" | Out-Null
```

---

## 4) Graphify وNx إلزاميان قبل التعديل

استخدم Graphify لفهم العلاقات قبل لمس الكود:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"

pnpm run graphify:code
if ($LASTEXITCODE -ne 0) { throw "graphify:code failed" }

pnpm run nx:projects
if ($LASTEXITCODE -ne 0) { Write-Host "WARN: nx:projects failed; capture evidence and continue only if Nx is not configured for this branch." }
```

احفظ ملاحظات العلاقات في:

```text
services/dsh/evidence/DSH-001-store-discovery/graph-analysis-notes.md
```

يجب أن يحتوي الملف على:

```markdown
# Graph Analysis Notes — DSH-001

## Relevant Existing Nodes

## Relevant Import/Route/Runtime Links

## Missing Links To Add

## Dead/Forbidden Links To Avoid
```

---

## 5) تحليل machine-readable إلزامي

يوجد مجلد:

```text
C:\bthwani-suite-next\machine-readable
```

لا تفترض صحته. افحصه رقميًا:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"

Write-Host "=== machine-readable inventory ==="
Get-ChildItem -LiteralPath ".\machine-readable" -Recurse -Force |
  Select-Object FullName, Length, LastWriteTime

Write-Host "=== machine-readable file heads ==="
Get-ChildItem -LiteralPath ".\machine-readable" -Recurse -File -Force |
  ForEach-Object {
    Write-Host "`n--- $($_.FullName) ---"
    Get-Content -LiteralPath $_.FullName -TotalCount 120
  }
```

صنّف كل ملف بقرار واحد فقط:

```text
KEEP_ACTIVE
KEEP_EVIDENCE_ONLY
MERGE_INTO_SLICE_PLAN
MOVE_TO_REGISTRY_RUN
RETIRE_DEAD
FIX_REQUIRED_NOW
```

قواعد القرار:

```text
- إذا كان مصدر حقيقة للشريحة: KEEP_ACTIVE أو MERGE_INTO_SLICE_PLAN.
- إذا كان ناتج تشخيص مؤقت: MOVE_TO_REGISTRY_RUN أو RETIRE_DEAD.
- إذا يكرر master matrix أو evidence-plan: MERGE ثم احذف التكرار.
- إذا يحتوي preview/demo/mock أو IDs وهمية: FIX_REQUIRED_NOW.
- إذا يناقض service.manifest/capability-map/surface-map: FIX_REQUIRED_NOW.
- إذا لا يمكن إثبات مصدره: KEEP_EVIDENCE_ONLY وليس مصدر تنفيذ.
```

اكتب التدقيق في:

```text
services/dsh/evidence/DSH-001-store-discovery/machine-readable-audit.md
```

لا تبدأ OpenAPI قبل إنهاء هذا التدقيق.

---

## 6) تحليل المانح قراءة فقط

افحص المانح بدون تعديل:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite"
$ErrorActionPreference = "Stop"

git branch --show-current
git status --short

git fetch origin

git ls-remote --heads origin realtest
```

افحص DSH في المانح:

```powershell
Get-ChildItem -LiteralPath ".\dsh" -Recurse -File |
  Where-Object { $_.FullName -match "store|stores|merchant|vendor|discovery|home|market|restaurant|category|shop" } |
  Select-Object FullName, Length
```

افحص UI Kit في المانح:

```powershell
Get-ChildItem -LiteralPath ".\ui-kit" -Recurse -File |
  Select-Object FullName, Length
```

افحص WLT في المانح للحدود المالية فقط:

```powershell
Get-ChildItem -LiteralPath ".\wlt" -Recurse -File |
  Where-Object { $_.FullName -match "wallet|payment|refund|settlement|ledger|cod|commission|payout|finance" } |
  Select-Object FullName, Length
```

الاستفادة المسموحة:

```text
- فهم تجربة عرض المتاجر.
- فهم layout/cards/empty/loading/error states.
- فهم density وترتيب المعلومات.
- فهم Docker runtime pattern فقط.
- فهم DSH/WLT boundary.
- استخراج أفكار تصميمية وتحسينها في الجديد.
```

الممنوع:

```text
- نسخ ملفات كاملة.
- نسخ compose القديم.
- نسخ أسماء containers/ports/networks/volumes.
- نسخ design system محلي.
- نسخ preview/demo/mock data.
- نقل financial logic إلى DSH.
```

اكتب المخرجات في:

```text
C:\bthwani-suite-next\services\dsh\evidence\DSH-001-store-discovery\donor-extraction-notes.md
```

صيغة الملف:

```markdown
# Donor Extraction Notes — DSH-001

## Accepted Patterns

| Donor Path | Accepted Idea | New Target | Reason |
|---|---|---|---|

## Rejected Patterns

| Donor Path | Rejected Item | Reason |
|---|---|---|
```

---

## 7) تجهيز ملف الشريحة الأولى

أنشئ أو حدّث:

```text
services/dsh/capabilities/store-discovery/evidence-plan.md
```

يجب أن يكون عقد تنفيذ، لا تقريرًا عامًا.

الحد الأدنى للمحتوى:

```markdown
# DSH-001 Store Discovery — Slice Evidence Plan

## Slice Identity
- Slice ID: DSH-001
- Capability ID: dsh.store.discovery
- Service Owner: services/dsh
- Primary Surface: app-client
- Execution Mode: full-stack, Docker-backed, evidence-gated

## In Scope
- OpenAPI: GET /dsh/stores
- OpenAPI: GET /dsh/stores/{storeId}
- Domain types/policy/errors
- DSH database migration and local seed
- DSH backend repository/handlers/routes
- DSH runtime health/readiness
- DSH Docker profile activation
- Generated typed client
- Frontend shared adapter
- app-client Store Discovery screen
- Live API smoke
- Live UI screenshot

## Out of Scope
- control-panel
- app-partner
- app-captain
- app-field
- cart
- checkout
- order lifecycle
- payment
- wallet
- refund
- settlement
- payout
- commission
- COD ledger
- WLT runtime
- MinIO upload workflow
- Redis
- Mongo

## Required Evidence
- git-status.txt
- git-diff-check.txt
- foundation-gate.txt
- contracts-lint.txt
- docker-runtime-smoke.txt
- docker-ps.txt
- migration-output.txt
- seed-output.txt
- api-smoke-health.txt
- api-smoke-readiness.txt
- api-smoke-list-stores.txt
- api-smoke-get-store.txt
- dsh-package-typecheck.txt
- dsh-package-build.txt
- dsh-package-test.txt
- dsh-package-lint.txt
- slice-gate.txt
- app-client-store-discovery-screenshot.png
- machine-readable-audit.md
- donor-extraction-notes.md
- graph-analysis-notes.md
```

بعد الملف:

```powershell
git diff --check
pnpm run foundation:gate
pnpm run contracts:lint
pnpm run docker:runtime:smoke
pnpm run guard:matrix:v3
```

---

## 8) تنظيم وتسمية الملفات

التزم بالآتي:

```text
- Domain/shared/api files: kebab-case.
- React screens/components: PascalCase.
- Folders: kebab-case.
- لا أسماء عامة: screen.tsx, index2.ts, stores-new.ts, temp.ts, test-new.ts.
- لا بنية موازية إذا توجد بنية قائمة.
- لا dead routes.
- لا duplicate screens.
```

المسارات المستهدفة، مع جواز التكييف إذا اكتشفت بنية قائمة أفضل:

```text
services/dsh/capabilities/store-discovery/evidence-plan.md

services/dsh/domain/store-discovery/store-discovery.types.ts
services/dsh/domain/store-discovery/store-discovery.policy.ts
services/dsh/domain/store-discovery/store-discovery.errors.ts
services/dsh/domain/store-discovery/index.ts

services/dsh/database/migrations/dsh-001_store_discovery.sql
services/dsh/database/seeds/local/dsh-001_store_discovery.local.sql

services/dsh/backend/store-discovery/store-discovery.repository.ts
services/dsh/backend/store-discovery/store-discovery.handlers.ts
services/dsh/backend/store-discovery/store-discovery.routes.ts
services/dsh/backend/runtime/server.ts
services/dsh/backend/runtime/health.ts
services/dsh/backend/runtime/readiness.ts
services/dsh/backend/Dockerfile

services/dsh/clients/generated/dsh-api.ts
services/dsh/clients/store-discovery-client.ts

services/dsh/frontend/shared/store-discovery/store-discovery.api.ts
services/dsh/frontend/shared/store-discovery/store-discovery.types.ts
services/dsh/frontend/shared/store-discovery/store-discovery.view-model.ts
services/dsh/frontend/shared/store-discovery/store-discovery.states.ts
services/dsh/frontend/shared/store-discovery/store-discovery.permissions.ts
services/dsh/frontend/shared/store-discovery/store-discovery.formatters.ts
services/dsh/frontend/shared/store-discovery/index.ts

services/dsh/frontend/app-client/store-discovery/StoreDiscoveryScreen.tsx
services/dsh/frontend/app-client/store-discovery/StoreDiscoveryRoute.tsx
services/dsh/frontend/app-client/store-discovery/StoreDiscoveryList.tsx
services/dsh/frontend/app-client/store-discovery/StoreDiscoveryCard.tsx
services/dsh/frontend/app-client/store-discovery/StoreDiscoveryEmptyState.tsx
services/dsh/frontend/app-client/store-discovery/StoreDiscoveryErrorState.tsx
services/dsh/frontend/app-client/store-discovery/index.ts
```

---

## 9) OpenAPI أولًا

حدّث:

```text
services/dsh/contracts/dsh.openapi.yaml
```

أضف فقط:

```text
GET /dsh/stores
operationId: listDshStores

GET /dsh/stores/{storeId}
operationId: getDshStore
```

Schemas مطلوبة:

```text
DshStoreStatus
DshStoreServiceabilityStatus
DshStoreSummary
DshStoreDetail
DshStoreServiceabilitySummary
DshStoreListResponse
DshStoreDetailResponse
DshErrorResponse
DshPagination
```

قواعد العقد:

```text
- pagination mandatory.
- filters: cityCode, serviceAreaCode, status, isVisible when appropriate.
- responses: 200, 400, 404, 500.
- لا checkout/cart/order.
- لا WLT financial truth fields.
- لا preview/demo/mock wording.
```

بعد التعديل:

```powershell
pnpm run contracts:lint
if ($LASTEXITCODE -ne 0) { throw "contracts:lint failed after DSH-001 OpenAPI" }
```

لا تنتقل للدومين إذا فشل.

---

## 10) الدومين

أنشئ domain types/policy/errors.

الحالات:

```text
Store status:
- active
- inactive
- temporarily_closed
- unavailable

Serviceability:
- serviceable
- limited
- out_of_area
- unavailable
```

الدومين يقرر:

```text
- أي store يظهر للعميل.
- ترتيب المتاجر.
- الإخفاء.
- city/service area filtering.
- عدم تسريب بيانات داخلية.
```

ممنوع داخل الدومين:

```text
- SQL.
- React/UI.
- Docker.
- fetch.
- WLT mutation.
```

---

## 11) قاعدة البيانات

أنشئ:

```text
services/dsh/database/migrations/dsh-001_store_discovery.sql
services/dsh/database/seeds/local/dsh-001_store_discovery.local.sql
```

Migration minimum:

```sql
CREATE TABLE IF NOT EXISTS dsh_stores (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  status text NOT NULL,
  city_code text NOT NULL,
  service_area_code text NOT NULL,
  serviceability_status text NOT NULL,
  rating_average numeric(3,2),
  rating_count integer NOT NULL DEFAULT 0,
  delivery_eta_min integer,
  delivery_eta_max integer,
  is_visible boolean NOT NULL DEFAULT true,
  hero_image_url text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dsh_stores_status_chk CHECK (status IN ('active','inactive','temporarily_closed','unavailable')),
  CONSTRAINT dsh_stores_serviceability_chk CHECK (serviceability_status IN ('serviceable','limited','out_of_area','unavailable')),
  CONSTRAINT dsh_stores_rating_average_chk CHECK (rating_average IS NULL OR (rating_average >= 0 AND rating_average <= 5)),
  CONSTRAINT dsh_stores_rating_count_chk CHECK (rating_count >= 0),
  CONSTRAINT dsh_stores_eta_chk CHECK (
    delivery_eta_min IS NULL OR delivery_eta_max IS NULL OR delivery_eta_min <= delivery_eta_max
  )
);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_city_code ON dsh_stores(city_code);
CREATE INDEX IF NOT EXISTS idx_dsh_stores_service_area_code ON dsh_stores(service_area_code);
CREATE INDEX IF NOT EXISTS idx_dsh_stores_status ON dsh_stores(status);
CREATE INDEX IF NOT EXISTS idx_dsh_stores_is_visible ON dsh_stores(is_visible);
```

Seed rules:

```text
- بيانات local حقيقية لغرض الاختبار، لا تسمى demo/preview/mock.
- IDs ثابتة مثل store-1001/store-1002.
- لا fake actor IDs.
- لا payment/wallet/refund/settlement fields.
- لا donor database import.
```

---

## 12) Backend runtime

افحص أولًا إن كانت بنية runtime موجودة. إن لم توجد، أنشئ runtime TypeScript بسيطًا داخل `services/dsh/backend`.

حدّث `services/dsh/package.json` بحيث لا يبقى no-op.

المطلوب الحقيقي:

```json
{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "build": "tsc -p tsconfig.json",
    "test": "node --test dist/**/*.test.js",
    "lint": "node ../../tools/guards/no-preview-demo-mock-runtime.mjs && node ../../tools/guards/no-memory-repo-in-slice-runtime.mjs"
  }
}
```

عدّل حسب البنية الفعلية، لكن ممنوع بقاء أي رسائل:

```text
no typecheck configured yet
no build configured yet
no tests configured yet
no lint configured yet
```

Backend endpoints:

```text
GET /dsh/health
GET /dsh/readiness
GET /dsh/stores
GET /dsh/stores/:storeId
```

Rules:

```text
- Postgres repository فقط.
- no memory repo in runtime.
- no CORS wildcard.
- no preview/demo/mock data.
- timeout واضح.
- typed errors.
- pagination mandatory.
- OpenAPI-compatible responses.
```

---

## 13) Docker activation لشريحة DSH فقط

بعد وجود backend حقيقي فقط، فعّل DSH profile.

حدّث:

```text
infra/docker/compose.runtime.yml
```

أضف service تحت profile `dsh`:

```yaml
  dsh-api:
    profiles:
      - dsh
    build:
      context: ../..
      dockerfile: services/dsh/backend/Dockerfile
    container_name: ${BTHWANI_DSH_API_CONTAINER:-bthwani-dsh-api-runtime}
    restart: unless-stopped
    environment:
      PORT: "8080"
      DATABASE_URL: "postgres://dsh_runtime:dsh_runtime_password@postgres:5432/dsh_runtime?sslmode=disable"
      DSH_AUTH_MODE: "public-read-store-discovery"
    ports:
      - "${BTHWANI_DSH_API_HOST_PORT:-58080}:8080"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/dsh/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 6
    networks:
      - bthwani-runtime
```

لا تفعّل WLT.

حدّث:

```text
infra/docker/runtime-profiles/dsh.runtime-profile.json
```

إلى:

```json
"state": "ACTIVE"
```

لكن يجب أيضًا تحديث `tools/guards/docker-runtime-profiles.mjs` ليقبل `dsh` = `ACTIVE` فقط إذا تحقق:

```text
- compose.runtime.yml contains dsh-api service.
- services/dsh/backend/Dockerfile exists.
- smoke-dsh-runtime.ps1 no longer throws RESERVED_NOT_ACTIVE.
- dsh migration exists.
- dsh seed exists.
- no donor Docker terms.
- no minio latest.
```

لا تجعل guard يقبل ACTIVE بشكل أعمى.

حدّث:

```text
infra/docker/scripts/smoke-dsh-runtime.ps1
```

ليختبر:

```text
docker compose --profile dsh ps
GET http://localhost:58080/dsh/health
GET http://localhost:58080/dsh/readiness
GET http://localhost:58080/dsh/stores
GET http://localhost:58080/dsh/stores/store-1001
```

---

## 14) تطبيق migration/seed حيًا

أنشئ:

```text
infra/docker/scripts/apply-dsh-store-discovery-db.ps1
```

يجب أن:

```text
- يتأكد من repo root.
- يشغل docker runtime.
- يطبق migration على dsh_runtime.
- يطبق seed على dsh_runtime.
- يكتب output واضح.
- يفشل عند أول خطأ.
```

استخدم طريقة آمنة بالـ stdin:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$ErrorActionPreference = "Stop"

pnpm run docker:runtime:up
if ($LASTEXITCODE -ne 0) { throw "docker runtime up failed" }

Get-Content -LiteralPath ".\services\dsh\database\migrations\dsh-001_store_discovery.sql" -Raw |
  docker compose --env-file .\infra\docker\env\runtime.env.example -f .\infra\docker\compose.runtime.yml exec -T postgres `
    psql -U bthwani_runtime -d dsh_runtime -v ON_ERROR_STOP=1

if ($LASTEXITCODE -ne 0) { throw "DSH-001 migration failed" }

Get-Content -LiteralPath ".\services\dsh\database\seeds\local\dsh-001_store_discovery.local.sql" -Raw |
  docker compose --env-file .\infra\docker\env\runtime.env.example -f .\infra\docker\compose.runtime.yml exec -T postgres `
    psql -U bthwani_runtime -d dsh_runtime -v ON_ERROR_STOP=1

if ($LASTEXITCODE -ne 0) { throw "DSH-001 seed failed" }
```

إذا `dsh_runtime` غير موجودة، أصلح init script أو أعد runtime الجديد فقط:

```powershell
pnpm run docker:runtime:reset
```

ممنوع:

```text
docker system prune --volumes
docker volume prune
docker compose down -v بدون -f infra/docker/compose.runtime.yml
```

---

## 15) Generated client

بعد نجاح OpenAPI:

```powershell
pnpm exec openapi-typescript .\services\dsh\contracts\dsh.openapi.yaml -o .\services\dsh\clients\generated\dsh-api.ts
```

أنشئ wrapper:

```text
services/dsh/clients/store-discovery-client.ts
```

Rules:

```text
- typed only.
- base URL من env.
- errors typed.
- لا direct fetch داخل الشاشة.
- لا mock fallback.
```

---

## 16) Frontend shared adapter

أنشئ:

```text
services/dsh/frontend/shared/store-discovery/*
```

وظيفته:

```text
- API DTO -> ViewModel.
- توحيد loading/empty/error/service unavailable states.
- no preview/demo/mock data.
- no direct fetch from screen.
- no local design system.
```

---

## 17) App-client Store Discovery UI

أنشئ الشاشة تحت:

```text
services/dsh/frontend/app-client/store-discovery/
```

لكن قبل ذلك افحص routing/app-shell الحقيقي:

```text
apps/app-client/runtime/**
shared/app-shell/**
services/dsh/frontend/**
```

لا تنشئ route ميتًا.

متطلبات التصميم:

```text
- استخدام @bthwani/ui-kit فقط.
- no raw hex خارج ui-kit.
- no local design system.
- no direct vector icon import إذا يمنعه guard.
- visual identity فاخرة وعصرية وعملية.
- cards واضحة للمتاجر.
- loading state.
- empty state.
- error state.
- service unavailable state.
- city/service area visible.
- لا screen قبل data binding.
```

أسماء الملفات:

```text
StoreDiscoveryScreen.tsx
StoreDiscoveryRoute.tsx
StoreDiscoveryList.tsx
StoreDiscoveryCard.tsx
StoreDiscoveryEmptyState.tsx
StoreDiscoveryErrorState.tsx
index.ts
```

استفد من المانح بصريًا فقط:

```text
- layout فكرة فقط.
- card hierarchy فكرة فقط.
- empty/error state idea فقط.
- لا نسخ كود.
- حسّن الهوية في الجديد عبر ui-kit.
```

---

## 18) الاختبار الحي

بعد التنفيذ:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$ErrorActionPreference = "Stop"

git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check failed" }

pnpm run foundation:gate
if ($LASTEXITCODE -ne 0) { throw "foundation:gate failed" }

pnpm run contracts:lint
if ($LASTEXITCODE -ne 0) { throw "contracts:lint failed" }

pnpm run docker:runtime:smoke
if ($LASTEXITCODE -ne 0) { throw "docker:runtime:smoke failed" }

pnpm run guard:matrix:v3
if ($LASTEXITCODE -ne 0) { throw "guard:matrix:v3 failed" }

node .\tools\guards\docker-runtime-profiles.mjs
if ($LASTEXITCODE -ne 0) { throw "docker-runtime-profiles failed" }

pnpm --dir services/dsh run typecheck
if ($LASTEXITCODE -ne 0) { throw "DSH typecheck failed" }

pnpm --dir services/dsh run build
if ($LASTEXITCODE -ne 0) { throw "DSH build failed" }

pnpm --dir services/dsh run test
if ($LASTEXITCODE -ne 0) { throw "DSH test failed" }

pnpm --dir services/dsh run lint
if ($LASTEXITCODE -ne 0) { throw "DSH lint failed" }
```

تشغيل حي:

```powershell
pnpm run docker:runtime:up
if ($LASTEXITCODE -ne 0) { throw "docker runtime up failed" }

pwsh -NoProfile -ExecutionPolicy Bypass -File .\infra\docker\scripts\apply-dsh-store-discovery-db.ps1
if ($LASTEXITCODE -ne 0) { throw "apply DSH-001 DB failed" }

docker compose --env-file .\infra\docker\env\runtime.env.example `
  -f .\infra\docker\compose.runtime.yml `
  --profile dsh up -d --build
if ($LASTEXITCODE -ne 0) { throw "DSH docker profile up failed" }

pwsh -NoProfile -ExecutionPolicy Bypass -File .\infra\docker\scripts\smoke-dsh-runtime.ps1
if ($LASTEXITCODE -ne 0) { throw "DSH runtime smoke failed" }
```

API direct smoke:

```powershell
Invoke-RestMethod "http://localhost:58080/dsh/health"
Invoke-RestMethod "http://localhost:58080/dsh/readiness"
Invoke-RestMethod "http://localhost:58080/dsh/stores"
Invoke-RestMethod "http://localhost:58080/dsh/stores/store-1001"
```

App-client:

```powershell
pnpm --dir apps/app-client/runtime exec expo start --dev-client --host localhost --port 8081 --android
```

التقط screenshot لشاشة Store Discovery واحفظها في evidence.

---

## 19) Evidence capture إلزامي

أنشئ/حدّث:

```text
services/dsh/evidence/DSH-001-store-discovery/
```

احفظ:

```text
git-status.txt
git-diff-check.txt
foundation-gate.txt
contracts-lint.txt
docker-runtime-smoke.txt
docker-ps.txt
migration-output.txt
seed-output.txt
dsh-package-typecheck.txt
dsh-package-build.txt
dsh-package-test.txt
dsh-package-lint.txt
api-smoke-health.txt
api-smoke-readiness.txt
api-smoke-list-stores.txt
api-smoke-get-store.txt
slice-gate.txt
app-client-store-discovery-screenshot.png
donor-extraction-notes.md
machine-readable-audit.md
graph-analysis-notes.md
```

لا تعلن closure بدون هذه الملفات.

---

## 20) Slice gate

بعد كل شيء:

```powershell
pnpm run slice:gate
if ($LASTEXITCODE -ne 0) { throw "slice:gate failed" }
```

إذا فشل:

```text
- أصلح السبب الحقيقي.
- لا تغيّر gate ليقبل الفشل.
- لا تحذف guard.
- لا تحوّل failure إلى warning.
```

---

## 21) شروط الرفض

ارفض إغلاق DSH-001 إذا تحقق أي شرط:

```text
- OpenAPI لا يحتوي GET /dsh/stores.
- OpenAPI لا يحتوي GET /dsh/stores/{storeId}.
- DSH package scripts لا تزال no-op.
- screen تستخدم fetch مباشر.
- screen تستخدم data محلية وهمية.
- runtime يستخدم memory repo.
- WLT logic دخل داخل DSH.
- control-panel دخل داخل DSH-001.
- Docker لا يشغل dsh-api بعد activation.
- migration/seed لم تطبق على dsh_runtime.
- API smoke غير موجود.
- screenshot غير موجود.
- donor names/ports/volumes مستخدمة.
- machine-readable لم يتم تدقيقه.
- graph-analysis-notes.md غير موجود.
- لا توجد evidence لكل خطوة.
```

---

## 22) Commit strategy

استخدم commits صغيرة واضحة:

```text
docs(dsh): define DSH-001 store discovery evidence plan
chore(dsh): audit machine-readable inputs for DSH-001
docs(dsh): capture donor extraction notes for store discovery
feat(dsh-contract): add store discovery OpenAPI contract
feat(dsh-domain): add store discovery domain and database assets
feat(dsh-runtime): add Docker-backed store discovery API
feat(dsh-client): generate store discovery typed client
feat(app-client): add DSH store discovery screen
test(dsh): capture DSH-001 live evidence
```

ممنوع commit عام:

```text
update files
fix stuff
changes
wip
```

---

## 23) التقرير النهائي المطلوب

في نهاية التنفيذ اطبع تقريرًا مختصرًا فقط:

```markdown
# DSH-001 Store Discovery Closure Report

## Result
PASS / FAIL

## Branch
starting-implementing-slices

## Commits
- ...

## Implemented
- ...

## Live Evidence
- Docker profile:
- docker ps:
- health:
- readiness:
- list stores:
- get store:
- app-client screenshot:

## Guards
- git diff --check:
- foundation:gate:
- contracts:lint:
- docker:runtime:smoke:
- docker-runtime-profiles:
- guard:matrix:v3:
- slice:gate:

## Remaining
None / exact blockers only
```

لا تكتب `PASS` إذا أي دليل مفقود. لا تكتب “100%” إلا إذا كل الأدلة موجودة وناجحة.
