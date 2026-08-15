# 01 — Core Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/01-CORE-CONTRACT.md`

## 1) الحقيقة والسلطة

رتّب المصادر ديناميكيًا من أحدث رأس مثبت:

```text
current authorized task
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable engineering/security/delivery policy
→ applicable capability Product Truth
→ applicable machine contracts/registries/schemas
→ exact pinned implementation/runtime/repository-platform evidence
```

افصل دائمًا `AUTHORITY_TRUTH / PRODUCT_TRUTH / IMPLEMENTATION_TRUTH / RUNTIME_TRUTH / REPOSITORY_PLATFORM_TRUTH / DERIVED_HISTORICAL_SUPPORT`.

`plans/**` و`tools/prompting/**` لا تصبح Product/Implementation/Runtime truth ولا Proof of PASS/DONE.

## 2) Actual / Intended / Desired / Conflict

```text
ACTUAL   = ما يحدث الآن فعليًا.
INTENDED = ما تثبته السلطة/Product Truth الحالية.
DESIRED  = السلوك الصحيح بعد قرار صالح.
CONFLICT = أي اختلاف بينها.
```

## 3) FAIL-CLOSED

```text
DEFAULT_STATE = OPEN
UNPROVEN = OPEN
UNTESTED_REQUIRED_CLAIM = OPEN
KNOWN_UNRESOLVED = OPEN
MATERIAL_DECISION_REQUIRED_AND_UNRESOLVED = OPEN
STALE_EVIDENCE = OPEN for affected claim
UNACCOUNTED_MATERIAL_ITEM = OPEN
```

ممنوع ignore/defer/hide/patch-around/bypass/silent fallback/fake green/test weakening/force push/foreign-change overwrite/applied-migration rewrite أو إسقاط Finding/Dependency/Consumer/Scope Delta من السجل.

## 4) Scope Contract

`TARGET` نقطة بدء. النطاق الحقيقي:

```text
TARGET + Root Cause + Blast Radius + Writers/Readers/Consumers + Dependencies + Contracts + Data Flow + Runtime Path + required cross-surface behavior + related structural residue
```

إذا كان TARGET «كل شيء» فحوّله إلى Universe/Graph قابلة للتتبع، لا Mega document.

## 5) CODE_BASED_LEAN

```text
smallest complete root-cause scope
→ proven dependency/risk expansion
→ bounded global coverage
→ local adaptive depth
→ risk-proportional verification
```

## 6) SHA / Remote Pinning

قبل القراءة المعمقة أو الكتابة: resolve exact repo/ref → pin full SHA → read from pinned truth. قبل sequence creation، semantic write، integration، push وبعدها: re-resolve HEAD → classify movement → reconcile affected graph/evidence.

`DISJOINT` movement may be carried forward automatically. Semantic overlap reopens only affected nodes; direct conflict blocks the affected conflict domain, not unrelated independent work. Git textual mergeability is not semantic safety.

## 7) Capability Preflight

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
CAPABILITY EXISTS ≠ CAPABILITY WAS USED.
```

سجّل proof limits ولا تدعِ تشغيل ما لم يُشغل. استخدم تعدد الوكلاء فقط عندما توجد Missions/Graph scopes مستقلة مفيدة، لا لمجرد زيادة العدد.

## 8) MODE = Write Authority, not Diagnosis Method

القيم الوحيدة: `PREPARE_ONLY`, `EXECUTE_END_TO_END`.

كلاهما يستخدم نفس الصرامة:

```text
Global Discovery
→ Relation/Dependency/Impact Graph
→ derive proven execution frontier
→ diagnose current graph node/closure unit
→ Decision Boundary
→ full impact propagation
→ Re-Diagnosis
→ Solution Ready
```

الحركة ليست خطية: يمكن القفز رأسيًا/أفقيًا/عكسيًا/عبر الطبقات والأسطح إلى Root Cause أو Dependency أعمق، مع `SUSPENDED_BY_DEPENDENCY → upstream → REOPEN/RESUME`.

### PREPARE_ONLY

لكل Closure Unit مثبتة:

```text
diagnose → decide → propagate → re-diagnose
→ define exact root solution/coherent cutover
→ map consumers/governance/cleanup/verification
→ disposition findings/dependencies
→ PREPARED
→ reconcile graph/frontier
```

ممنوع Product/Governance/Runtime/Data mutation أو implementation commit. كل durable truth = `GOVERNANCE_PROMOTION_PENDING` مع exact owner/change.

### EXECUTE_END_TO_END

لا يشترط Global Package Ready قبل أول write. يشترط Sequence Write Gate للعقدة الحالية: root cause proven، decisions resolved، impact propagated، re-diagnosis complete، findings/dependencies dispositioned، owner/target/consumers known، verification defined، latest head reconciled، Conflict Domain/Execution Owner محددان.

بعد التنفيذ لا تعتبر العقدة `COMPLETE` حتى root fix + required consumers + obsolete/parallel truth removal + cleanup + verification + governance/scope gates. يمكن تنفيذ Frontiers مستقلة بالتوازي فقط عند إثبات استقلال Conflict Domains؛ target-branch integration يبقى serialized.

## 9) Protected / Irreversible Authority

قبل production/destructive/financial/secret/merge/release/deploy/protection/irreversible action أثبت authority + scope + candidate binding + rollback/compensation where possible.

## 10) Root Cause Contract

```text
Detect → Confirm → correlate Findings → Root Cause → Blast Radius → Canonical Owner
→ full impact propagation → Root Fix → migrate writers/readers/consumers
→ remove obsolete/parallel path → cleanup/refactor/redesign/rebuild
→ runtime/readback → verification → adversarial regression search
```

إذا كشف العمل Dependency أعمق، لا patch-around: علّق العقدة الحالية، عالج الأصل، ثم أعد تشخيص المتأثر قبل الاستئناف.

## 11) One Source / Ownership

حيثما ينطبق: one authoritative owner per durable fact، one canonical write path per transition، one contract provenance، one migration history، no runtime-facing mock/fallback truth.

## 12) Accounting / No Silent Loss

كل عنصر مادي يجب أن يكون قابلًا للإشارة والتصرف:

```text
Graph Node / Finding / Scope Delta / Decision / Consumer / Evidence / Cleanup disposition
```

لا final handoff/closure حتى تكون كل الفئات محسوبة و`ACCOUNTING_COMPLETE=YES`. `ZERO known findings` وحدها ليست completeness؛ يلزم adversarial/negative-space discovery.

## 13) Domain Risk Escalation

زد الأدلة تلقائيًا عند Security/Finance/DB migration/Concurrency/Events/Mobile offline/provider/shared contracts/high fanout.

## 14) Repository / Multi-Agent Safety

لكل writing agent: isolated workspace + mission + graph scope + input SHA + conflict domain + owned symbols/hunks + authority + handoff/invalidation trigger.

```text
ONE EXECUTION OWNER PER CONFLICT DOMAIN
MULTIPLE PROVEN-INDEPENDENT FRONTS MAY RUN
ONE TARGET-BRANCH INTEGRATION OWNER AT A TIME
NO STALE PUSH
NO FORCE PUSH
```

inventory foreign changes → allowlist owned paths/hunks → inspect diff → exact staging → inspect staged diff. لا `git add .` أو destructive workspace commands عند خطر مشاركة العمل.

## 15) Evidence Discipline

كل Evidence نهائية تعرف source/run/artifact, candidate_sha, environment, status, claim/proof limit, invalidation triggers. كل write/upstream change/head movement يحدد invalidation cone؛ احتفظ فقط بالأدلة التي ثبت عدم تأثرها.

## 16) Durable Governance

لا تبقى durable truth لازمة لفهم النظام داخل `plans/**` أو `tools/prompting/**` فقط. EXECUTE يرقّيها؛ PREPARE يسجل owner + exact pending change.

## 17) Package/Sequence Lean Rule

```text
ONE TASK PACKAGE ≠ ONE MEGA FILE
ONE SEQUENCE ≠ ONE REPOSITORY FOLDER
ONE SEQUENCE FILE = ONE COHERENT CLOSURE UNIT
SEQUENCE NUMBER ≠ FORCED EXECUTION ORDER
NO FUTURE SEQUENCE FILE WITHOUT PROVEN NEED
NO SUBDIRECTORY TREE FOR DOMAINS/SURFACES
```

إذا كان التسلسل يملك أكثر من Closure Boundary مستقل، أعد تعريف الرسم البياني وقسّمه إلى Sequences مستقلة. إذا كانت عدة أعراض لنفس Root Cause/Owner/Cutover/Verification فلا تفتتها بلا سبب.

## 18) Golden Rules

```text
SEARCH IS NOT TRUTH.
PLAN/PACKAGE IS NOT LIVE TRUTH.
OLD PASS/DONE IS NOT CURRENT EVIDENCE.
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
ACCOUNTING PREVENTS SILENT LOSS.
DEPENDENCIES GOVERN ORDER.
INDEPENDENCE GOVERNS PARALLELISM.
LATEST HEAD GOVERNS WRITES.
ONE INTEGRATION OWNER GOVERNS TARGET-BRANCH MUTATION.
EVIDENCE GOVERNS CLOSURE.
NO FAKE GREEN.
UNPROVEN = OPEN.
```
