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
```

ممنوع ignore/defer/hide/patch-around/bypass/silent fallback/fake green/test weakening/force push/foreign-change overwrite/applied-migration rewrite.

## 4) Scope Contract

`TARGET` نقطة بدء. النطاق الحقيقي:

```text
TARGET + Root Cause + Blast Radius + Writers/Readers/Consumers + Dependencies + Contracts + Data Flow + Runtime Path + required cross-surface behavior + related structural residue
```

إذا كان TARGET «كل شيء» فحوّله إلى Universe قابلة للتتبع، لا Mega document.

## 5) CODE_BASED_LEAN

```text
smallest complete root-cause scope
→ proven dependency/risk expansion
→ bounded global coverage
→ local adaptive depth
→ risk-proportional verification
```

## 6) SHA / Remote Pinning

قبل القراءة المعمقة أو الكتابة: resolve exact repo/ref → pin full SHA → read from pinned truth. قبل كل logical write batch وبعد آخر write/push: re-resolve HEAD → classify movement → reconcile.

## 7) Capability Preflight

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
CAPABILITY EXISTS ≠ CAPABILITY WAS USED.
```

سجّل proof limits ولا تدعِ تشغيل ما لم يُشغل.

## 8) MODE = Write Authority, not Diagnosis Method

القيم الوحيدة: `PREPARE_ONLY`, `EXECUTE_END_TO_END`.

كلاهما يستخدم:

```text
Global Discovery → Dependency Graph → Sequence-by-Sequence Diagnosis → Decision Boundary → Re-Diagnosis → Solution Ready
```

### PREPARE_ONLY

لكل Sequence:

```text
diagnose → decide → re-diagnose → define exact root solution → map consumers/governance/cleanup/verification → PREPARED → next
```

ممنوع Product/Governance/Runtime/Data mutation أو implementation commit. كل durable truth = `GOVERNANCE_PROMOTION_PENDING` مع exact owner/change.

### EXECUTE_END_TO_END

لا يشترط Global Package Ready قبل أول write. يشترط Sequence Write Gate الحالي: root cause proven، decisions resolved، re-diagnosis complete، owner/target/consumers known، verification defined، latest base reconciled. بعد التنفيذ لا ينتقل للتالي حتى Sequence Exit Gate.

## 9) Protected / Irreversible Authority

قبل production/destructive/financial/secret/merge/release/deploy/protection/irreversible action أثبت authority + scope + candidate binding + rollback/compensation where possible.

## 10) Root Cause Contract

```text
Detect → Confirm → Root Cause → Blast Radius → Canonical Owner → Root Fix → migrate writers/readers/consumers → remove obsolete path → cleanup/refactor/redesign/rebuild → runtime/readback → verification → adversarial regression search
```

## 11) One Source / Ownership

حيثما ينطبق: one authoritative owner per durable fact، one canonical write path per transition، one contract provenance، one migration history، no runtime-facing mock/fallback truth.

## 12) Domain Risk Escalation

زد الأدلة تلقائيًا عند Security/Finance/DB migration/Concurrency/Events/Mobile offline/provider/shared contracts/high fanout.

## 13) Repository Safety

inventory foreign changes → allowlist owned paths/hunks → inspect diff → exact staging → inspect staged diff. لا `git add .` أو destructive workspace commands عند خطر مشاركة العمل.

## 14) Evidence Discipline

كل Evidence نهائية تعرف source/run/artifact, candidate_sha, environment, status, claim/proof limit, invalidation triggers.

## 15) Durable Governance

لا تبقى durable truth لازمة لفهم النظام داخل `plans/**` أو `tools/prompting/**` فقط. EXECUTE يرقّيها؛ PREPARE يسجل owner + exact pending change.

## 16) Package/Sequence Lean Rule

```text
ONE TASK PACKAGE ≠ ONE MEGA FILE
ONE SEQUENCE ≠ ONE REPOSITORY FOLDER
ONE SEQUENCE FILE = ONE COHERENT CLOSURE UNIT
NO FUTURE SEQUENCE FILE WITHOUT PROVEN NEED
NO SUBDIRECTORY TREE FOR DOMAINS/SURFACES
```

إذا كان التسلسل يملك أكثر من Closure Boundary مستقل، أعد تعريف الرسم البياني وقسّمه إلى Sequences مستقلة.

## 17) Golden Rules

```text
SEARCH IS NOT TRUTH.
PLAN/PACKAGE IS NOT LIVE TRUTH.
OLD PASS/DONE IS NOT CURRENT EVIDENCE.
ROOT CAUSE FIRST.
BLAST RADIUS DEFINES REAL SCOPE.
NO PRODUCT/ARCHITECTURE GUESSING.
NO PRECREATED FUTURE SEQUENCES.
NO MEGA PACKAGE BY DEFAULT.
NO FAKE GREEN.
UNPROVEN = OPEN.
```
