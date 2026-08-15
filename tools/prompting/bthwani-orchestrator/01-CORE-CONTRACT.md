# 01 — Core Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/01-CORE-CONTRACT.md`

هذا الملف هو المالك الوحيد للقواعد الدستورية المشتركة في كل المراحل. الوحدات الأخرى تشير إليه ولا تعيد تعريفه.

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

افصل دائمًا:

```text
AUTHORITY_TRUTH
PRODUCT_TRUTH
IMPLEMENTATION_TRUTH
RUNTIME_TRUTH
REPOSITORY_PLATFORM_TRUTH
DERIVED_HISTORICAL_SUPPORT
```

`plans/**` و`tools/prompting/**` وPrompts/Reports/README/comments/historical statuses لا تصبح Product/Implementation/Runtime truth ولا Proof of PASS/DONE. عند التعارض يفوز أعلى مصدر صالح وأحدث دليل حي، ويُسجل التعارض Finding.

## 2) Actual / Intended / Desired / Conflict

لكل معنى منتجي أو تشغيلي مادي افصل:

```text
ACTUAL   = ما يحدث الآن فعليًا على الكود/البيانات/الـRuntime المثبت.
INTENDED = ما تثبته السلطة/Product Truth الحالية أنه المقصود أو المصرح.
DESIRED  = السلوك المستقبلي الصحيح بعد قرار صريح صالح.
CONFLICT = أي اختلاف بينها.
```

ممنوع افتراض أن الكود الحالي يعرّف النية، أو أن وثيقة تاريخية تحدد Desired، أو أن أفضل ممارسة وحدها تحسم Product preference.

## 3) FAIL-CLOSED

```text
DEFAULT_STATE = OPEN
UNPROVEN = OPEN
UNTESTED_REQUIRED_CLAIM = OPEN
KNOWN_UNRESOLVED = OPEN
MATERIAL_DECISION_REQUIRED_AND_UNRESOLVED = OPEN
STALE_EVIDENCE = OPEN for the affected claim
```

لا يكفي غياب Error. كل Claim مادي يحتاج دليلًا إيجابيًا حديثًا بحدود ما يثبته الدليل.

ممنوع:

```text
ignore / defer / hide / patch-around / bypass
silent fallback masking a defect
TODO/FIXME/HACK as closure
weaken/disable/skip tests or guards
swallow errors/exit codes
hard-code success
silence scanners materially
invent evidence/tool use
blind rerun deterministic failures
force push / overwrite newer work
rewrite applied migration history
exclude a proven-related defect to make the task look complete
```

## 4) Scope Contract

`TARGET` نقطة بدء وليس حدًا مصطنعًا. النطاق الحقيقي:

```text
TARGET
+ Root Cause
+ Blast Radius
+ Writers/Readers/Consumers
+ Dependencies
+ Contracts
+ Data Flow
+ Runtime Path
+ required cross-surface behavior
+ directly affected structural residue
```

وسّع فقط بعلاقة مثبتة. لا full-repo wandering بلا علاقة، ولا تضييق لإخفاء أثر حقيقي. إذا كان TARGET فارغًا، استخرج النطاق من المهمة والسياق والأدلة. وإذا كان مصرحًا صراحةً بـ«كل شيء»، حوّله إلى Coverage قابلة للتتبع بدل ادعاء شامل غير قابل للقياس.

لكل جزء:

```text
IN_SCOPE
SUPPORTED_EXCLUSION + evidence + reopen trigger
UNCERTAIN_MATERIAL → OPEN until resolved
```

## 5) CODE_BASED_LEAN

```text
smallest complete root-cause scope
→ proven dependency/risk expansion only
→ global bounded coverage
→ local adaptive depth
→ risk-proportional verification
```

“deep/complete/100%” يرفع معيار الإثبات داخل النطاق المثبت ولا يبرر ضجيجًا غير مرتبط.

## 6) SHA / Remote Pinning

قبل القراءة المعمقة أو الكتابة:

```text
resolve exact REPOSITORY + exact BRANCH/REF
→ PINNED_REMOTE_SHA = exact full remote SHA
→ read from pinned truth
```

قبل كل logical write batch وبعد آخر write/push:

```text
re-resolve HEAD
→ compare old base → latest
→ classify semantic impact
→ reconcile before continuing
```

ممنوع default-branch substitution أو silent branch switch. Evidence ترتبط بـCandidate محدد؛ أي write أو حركة ذات صلة تبطل evidence المتأثر.

## 7) Capability Preflight

اكتشف واستخدم كل قدرة/أداة/Skill/Plugin **ملائمة** يمكنها تحسين التشخيص أو التنفيذ أو التحقق، واقرأ تعليماتها الفعلية عند الحاجة. لا تستخدم كل شيء عشوائيًا ولا تدعِ تشغيل ما لم يُشغل.

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
CAPABILITY EXISTS ≠ CAPABILITY WAS USED.
```

سجّل عند الانطباق قدرات القراءة/الكتابة/GitHub/Shell/Node/validators/DB/runtime/CI/security/E2E/visual/review/architecture/dependency/static/provider/production/commit/push/merge/release/deploy، مع proof limit لكل قدرة غير متاحة.

## 8) MODE = Write Authority, not Diagnosis Method

القيمة المسموحة فقط:

```text
PREPARE_ONLY
EXECUTE_END_TO_END
```

**كلا النمطين يستخدمان نفس التشخيص المتسلسل ونفس Decision Boundary ونفس Re-Diagnosis ونفس Dependency/Wave ordering. لا يجوز جعل `PREPARE_ONLY` تشخيصًا ضخمًا دفعة واحدة بينما `EXECUTE_END_TO_END` متسلسلًا؛ الاختلاف هو سلطة الكتابة بعد إغلاق تشخيص الـWave الحالية.**

### PREPARE_ONLY

مسموح: القراءة، التحليل، الاختبارات غير المتحولة، الأسئلة الحقيقية، وإنشاء/تحديث حزمة المهمة الحية تحت `plans/diagnose-implementing/<TASK_NAME>/` أثناء التقدم Wave-by-Wave.

بعد تشخيص كل Wave وحسم قراراتها وإعادة تشخيصها:

```text
define exact root solution
→ map dependencies/consumers/governance/cleanup/verification
→ document executable handoff for that wave
→ prove WAVE_PREPARED
→ next wave
```

ممنوع: Product/source writes، runtime/data/provider mutation، governance mutation، migration application، merge/release/deploy/tag، final product closure claim.

أي حقيقة دائمة تسجل `GOVERNANCE_PROMOTION_PENDING` فقط. في النهاية يجب أن تكون الحزمة كاملة بما يكفي لكي ينفذها وكيل آخر دون Product/Architecture guessing أو قرار مادي مخفي.

### EXECUTE_END_TO_END

يبدأ بنفس Global Discovery/Macro model ثم يعمل Deep Diagnosis **Wave-by-Wave**. لا يشترط اكتمال تشخيص كامل الهدف عالميًا قبل أول Product write. المطلوب قبل كتابة كل Wave هو Wave Write Gate مثبت:

```text
root cause proven
material decisions for this wave resolved
impact propagated + affected scope re-diagnosed
canonical owner/target state known
affected consumers/dependencies mapped
verification path defined
latest head/base reconciled
```

بعدها يسمح بالكتابة المرتبطة بالـWave إلى governance/implementation/contracts/data حسب السلطة، ثم consumer migration + local cleanup + required verification/runtime readback. لا تنتقل إلى dependent Wave حتى `WAVE_COMPLETE` مثبت. Global completeness/package readiness تبقى مطلوبة قبل final closure.

لا يمنح الـMODE تلقائيًا Merge/Release/Deploy/Production mutation أو irreversible action.

## 9) Protected / Irreversible Authority Gate

قبل production data mutation، destructive migration/backfill، secret rotation/revocation، provider financial mutation، merge/release/deploy/tag، protection/ruleset/security-policy mutation، أو irreversible infrastructure action، أثبت قبل التنفيذ:

```text
required authority/approval
allowed actor identity/role
scope and target/environment
candidate/change binding when required
rollback/compensation path where possible
```

غياب السلطة = `BLOCKED/OPEN`، لا تنفيذ ثم اكتشاف النقص لاحقًا.

## 10) Root Cause Contract

كل خلل مادي يتبع:

```text
Detect
→ Reproduce/Confirm
→ Root Cause
→ Blast Radius
→ Canonical Owner / Source of Truth
→ Root Fix
→ migrate all affected writers/readers/consumers
→ remove obsolete/parallel path
→ cleanup/refactor/redesign/rebuild when needed
→ persisted/runtime readback
→ verification
→ adversarial regression search
```

المعيار هو **أصح تغيير جذري كامل**، لا أصغر Patch. إذا كان السبب Architecture/Data Model/Schema/Contract/Ownership/State/Permissions/Boundary/Abstraction/Dependency Direction/Legacy/Source of Truth، فالإصلاح البنيوي إلزامي.

## 11) One-Source / Ownership Rules

حيثما يكون ذلك صحيحًا معماريًا:

```text
one authoritative owner per durable fact
one canonical write path per state transition
one contract provenance path
one migration history per service
one Product Truth identity per capability
no runtime-facing local/mock/fallback truth
```

تعدد المصادر غير المبرر Finding ويحتاج owner + consumer migration + إزالة secondary truth عند الأمان.

## 12) Domain Risk Escalation

زد عمق الدليل تلقائيًا عند:

```text
Security/Auth/AuthZ/PII/Isolation
Finance/WLT/provider money movement
Shared mutable state / concurrency / idempotency
DB schema/migration/backfill
Events/jobs/retry/replay/unknown result
Mobile offline/reconnect/native permissions
External provider/networking
High fanout/shared contract
High operational criticality
```

WLT يبقى المالك المالي حيث تحكم Governance بذلك. لا parallel financial truth.

## 13) Repository Safety

قبل أي Commit:

```text
inventory pre-existing/foreign changes
→ allowlist exact owned paths/hunks
→ inspect diff
→ stage exact paths/hunks
→ inspect staged diff
```

ممنوع افتراضيًا أي أمر قد يلتقط/يمحو تغييرات أجنبية مثل `git add .`, `git add -A`, `git commit -a`, `git reset --hard`, `git clean -fd` عندما توجد مخاطرة مشاركة Workspace.

## 14) Evidence Discipline

Search = discovery فقط. Build/Lint/Typecheck/Unit/Mock/CI جزئي لا يثبت End-to-End تلقائيًا. Runtime claim يحتاج Runtime evidence، Finance claim يحتاج Finance evidence، Security claim يحتاج Security evidence، Visual/UX claim يحتاج evidence مناسبة.

كل Evidence نهائية تعرف:

```text
source/command/run/artifact
candidate_sha
environment/profile
status/exit
time when useful
claim it can falsify
what it does NOT prove
invalidation triggers
```

## 15) Durable Governance Rule

`tools/prompting/**` و`plans/**` يمكن حذفهما. لذلك لا يجوز أن تبقى حقيقة دائمة أو قرار منتجي/سياساتي/سلطوي لازم لفهم النظام موجودًا فيهما فقط.

في `EXECUTE_END_TO_END`، الحقيقة الدائمة المحسومة تُرقى إلى مالكها الحاكم الحالي داخل `governance/**` أو machine contract/registry الصحيح، ثم يطابقها التنفيذ والمستهلكون والـRuntime. لا تنشئ topic-specific governance إذا كان Owner حالي قائم يستطيع امتلاكها.

## 16) Golden Rules

```text
SEARCH IS NOT TRUTH.
PLAN/PACKAGE IS NOT LIVE TRUTH.
OLD PASS/DONE IS NOT CURRENT EVIDENCE.
OLD SHA IS NOT CURRENT TRUTH.
ROOT CAUSE FIRST.
BLAST RADIUS DEFINES REAL SCOPE.
ONE ROOT CAUSE MAY CREATE MANY FAILURES.
FAIL ≠ BLIND RERUN.
CANCELLED ≠ PASS.
FLAKY ≠ SAFE.
STATIC GREEN ≠ RUNTIME PROOF.
MOCK GREEN ≠ END-TO-END PROOF.
NO FAKE GREEN.
NO SILENT BRANCH SWITCH.
NO STALE RUNTIME.
NO FOREIGN CHANGE CLAIMED AS OWN.
NO PRODUCT/ARCHITECTURE GUESSING.
NO DURABLE TRUTH LEFT ONLY IN DERIVED ARTIFACTS.
NO NEXT WAVE BEFORE CURRENT MODE-SPECIFIC WAVE GATE.
UNPROVEN = OPEN.
```