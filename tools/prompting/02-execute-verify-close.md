# الأمر 2 — التنفيذ والتحقق والمراجعة والإغلاق الجذري FAIL-CLOSED

Status: DERIVED_SUPPORT

استخدم هذا الأمر بعد التشخيص/الخطة لتنفيذ الحزمة، أو تنفيذ مهمة مباشرة محدودة وآمنة، أو مراجعة Candidate مثبت read-only. الهدف هو إزالة السبب الجذري على أحدث حقيقة ريموت، بناء Candidate واضح، إثبات النتيجة عليه فعليًا End-to-End، ثم إصدار أعلى قرار تسمح به السلطة والأدلة الحالية فقط.

> هذا Prompt مساعد مشتق. كل enum/flag/status/approval/evidence/schema/path مذكور هنا يخضع للمصدر الحاكم الحالي على الـSHA المثبت. لا تجعل Prompt أو Package أو Report أو أي ملف داخل `plans/**` سلطة أعلى من Governance/Product Truth/Implementation Truth/Runtime Truth/Repository-Platform Truth.

## 0. العقد الإلزامي غير القابل للتفاوض — FAIL-CLOSED

```text
DEFAULT_STATE = OPEN
DONE/CLOSED is forbidden until proven on the latest valid immutable candidate.
```

وجود **أي خطأ، فجوة، تناقض، تكرار، ضجيج جوهري، كود ميت، اعتماد خاطئ، منطق ناقص، ربط أو تكامل ناقص، حالة غير معالجة، سلوك غير محسوم، Regression، خلل تشغيلي أو أثر جانبي معلوم داخل النطاق المثبت** يعني أن المهمة ما تزال OPEN.

**ممنوع قطعًا:**

```text
ignore / defer / hide / patch-around / workaround / bypass
silent fallback that masks a defect
TODO/FIXME as a substitute for closure
disable/skip/weaken tests or guards
swallow errors or exit codes
hard-code success
silence scanners materially
invent evidence or tool execution
exclude a related defect merely to make the task look complete
rerun deterministic failures blindly until green
rewrite applied migration history
force-push or overwrite concurrent newer work
```

لكل خلل:

```text
ROOT CAUSE
→ BLAST RADIUS
→ CANONICAL OWNER / SOURCE OF TRUTH
→ ROOT FIX
→ migrate every affected writer/reader/consumer
→ remove obsolete/parallel path
→ persisted/runtime readback
→ affected verification
→ adversarial regression search
```

المعيار ليس **أقل تغيير ممكن**، بل **أصح وأجذر وأنظف وأوضح تغيير كامل داخل النطاق المثبت**.

إذا تعذر إثبات بند مطلوب فهو **غير مغلق**. إذا ظهر خلل جديد تعود المهمة فورًا إلى `OPEN`. إذا بقي شيء معلوم قابل للمعالجة داخل النطاق فالتوقف على أنه DONE ممنوع.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <exact branch-or-ref>
MODE: <EXECUTE_PACKAGE | EXECUTE_DIRECT | REVIEW_CANDIDATE>
PACKAGE_PATH: <plans/diagnose-implementing/<task> | N/A>
TASK: <direct task | N/A>
CANDIDATE_SHA: <AUTO | exact-40-sha>
BASE_SHA_OR_RANGE: <AUTO | base-sha | commit-range>
CLAIMED_OUTCOME: <AUTO_FROM_PACKAGE | explicit measurable outcome>
DELIVERY: <LOCAL_ONLY | COMMIT | COMMIT_AND_PUSH>
```

`DELIVERY` لا يمنح ضمنيًا صلاحية `MERGE`, `TAG`, `RELEASE`, `DEPLOY`, production mutation أو destructive data operation. هذه تحتاج سلطة صريحة مستقلة إن كانت مطلوبة.

## 1. أوضاع التنفيذ

```text
EXECUTE_PACKAGE
= current package → current-truth/schema reconciliation → execute → cleanup → final candidate → verify/review/decide.

EXECUTE_DIRECT
= bounded, single-root-cause, low-risk task only.

REVIEW_CANDIDATE
= immutable read-only candidate review; no source/package/commit/push mutation.
```

`EXECUTE_DIRECT` يتحول إلزاميًا إلى Package عند أي من:

```text
multiple owners/root causes
multi-domain or multi-surface foundation
shared contract/schema change affecting multiple consumers
cross-domain transaction
migration/backfill/data-shape change
protected/high-risk domain:
auth/authz/sessions, privacy/secrets, isolation, finance,
CI/infrastructure/release/production, irreversible external side effect
```

### 1.1 بوابة handoff من التشخيص — لا تخمّن قرارًا مفقودًا

في `EXECUTE_PACKAGE` افحص قبل أول Product/Runtime write أن الحزمة لا تعتمد على قرار مادي غير محسوم.

```text
resolved decision from diagnosis
→ consume as an explicit constraint when still valid under current authority/truth

material decision gap still unresolved
→ OPEN/BLOCKED
→ do not invent Product/Architecture/Business preference during execution
```

لا تعِد فتح قرار حُسم صراحةً في التشخيص لمجرد تفضيل المنفذ خيارًا آخر؛ أعد فتحه فقط إذا ظهرت **أدلة جديدة مادية** أو تعارض مع مصدر سلطة/حقيقة أعلى أو تغيّر الـRoot Cause/Blast Radius بما يبطل القرار السابق. عندها سجّل سبب إعادة الفتح ولا تغيّره بصمت.

## 2. السلطة والحقيقة

رتب الحقيقة ديناميكيًا من المصادر الحاكمة الحالية:

```text
current authorized task/review
→ authority precedence
→ Governance + PRD + applicable policies
→ capability Product Truth
→ machine contracts/registries/schema
→ exact pinned implementation/runtime/repository-platform evidence
```

افصل دائمًا:

```text
AUTHORITY TRUTH
PRODUCT TRUTH
IMPLEMENTATION TRUTH
RUNTIME TRUTH
REPOSITORY-PLATFORM TRUTH
DERIVED/HISTORICAL SUPPORT
```

Search/discovery ليس Truth نهائيًا. Package/Prompt/Historical status أضعف من الحقيقة الحالية.

### 2.1 `plans/**` وPackage ليست تنفيذًا ولا إثباتًا

تعامل مع:

```text
plans/**
plans/diagnose-implementing/**
PACKAGE_PATH
```

كـ`DERIVED_SUPPORT`: قد تحتوي نية أو تشخيصًا أو قرارات أو خطوات مفيدة، لكنها **ليست كودًا حيًا، وليست Runtime Truth، وليست Proof أن التنفيذ موجود أو صحيح أو DONE**، وقد تكون قديمة أو ناقصة أو متناقضة مع الرأس الحالي.

قبل الاعتماد على أي Claim مادي منها:

```text
revalidate against current authority/product truth
→ exact current code/contracts/schema/config
→ writers/readers/consumers
→ migrations/data/runtime path
→ current tests/CI definitions
→ actual runtime/readback when claim requires it
```

أي old `PASS/DONE/CLOSED/evidence` لا يورث تلقائيًا. عند التعارض:

```text
higher-authority/current live evidence wins
→ record contradiction as Finding
→ reconcile package before affected execution
```

لا تنفذ خطة قديمة ميكانيكيًا إذا أثبت الرأس الحالي أن Root Cause أو Owner أو Contract أو Runtime Path تغير.

استخدم فقط:

```text
CODE_BASED_LEAN
AFFECTED_PLUS_RISK_EXPANSION
```

لا full-repo sweep بلا علاقة مثبتة، ولا تضيق النطاق لإخفاء dependency أو blast radius مثبت.

## 3. تثبيت الريموت والهوية التنفيذية

قبل التشخيص أو الكتابة:

```text
resolve exact REPOSITORY
resolve exact TARGET_REF
STARTING_REMOTE_SHA = exact full 40-SHA
record TASK_IDENTITY / PACKAGE_IDENTITY
record BASE intent
```

ممنوع:

```text
default branch substitution
silent branch switch
guessing a missing ref
using local stale ref as remote truth
```

إذا `PACKAGE_PATH` موجود:

```text
same task identity → RESUME_AND_RECONCILE
same path + different task identity → COLLISION; do not overwrite
stale package → rebaseline against current truth before product writes
```

`استمر` يعني تابع المهمة الحالية مع الحفاظ على evidence غير المبطل، لا تبدأ من الصفر بلا سبب.

## 4. Capability Preflight + Pre-Execution Authority Gate

**اكتشف واستخدم تلقائيًا جميع قدرات وأدوات وإضافات وتكاملات Codex المتاحة والملائمة للمهمة** عندما تحسن التنفيذ أو المراجعة أو كشف الأخطاء أو التحقق أو الإغلاق. عند وجود Skill/Plugin مناسب، اقرأ تعليماته الفعلية قبل استخدامه. لا تهمل Capability ملائمة، ولا تستخدم أدوات غير ذات صلة لمجرد توفرها، ولا تدّع تشغيل أداة لم تُشغّل.

سجّل ما ينطبق:

```text
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_QUERY_LIVE_GITHUB
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_VALIDATOR
CAN_RUN_DATABASE
CAN_RUN_RUNTIME
CAN_RUN_CI
CAN_RUN_SECURITY_CHECKS
CAN_RUN_E2E
CAN_RUN_VISUAL
CAN_RUN_CODE_REVIEW
CAN_RUN_ARCHITECTURE_ANALYSIS
CAN_RUN_DEPENDENCY_ANALYSIS
CAN_RUN_STATIC_ANALYSIS
CAN_ACCESS_PROVIDER
CAN_VERIFY_PRODUCTION
CAN_COMMIT
CAN_PUSH
CAN_MERGE
CAN_RELEASE
CAN_DEPLOY
```

لكل evidence scope:

```text
required capability
available?
acquisition path
proof limit
```

غياب القدرة المطلوبة لا يصبح PASS.

المبدأ:

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
CAPABILITY EXISTS ≠ CAPABILITY WAS USED.
```

### بوابة قبل العمليات المحمية أو غير القابلة للعكس

قبل أي من:

```text
production DB/data mutation
destructive migration/backfill
secret/key rotation or revocation
provider-side financial/external mutation
merge/release/deploy/tag
ruleset/protection/security-policy mutation
irreversible infrastructure action
```

أثبت **قبل التنفيذ**:

```text
required authority/approval
allowed actor identity/role
scope of approval
exact target/environment
candidate/change binding when required
rollback/compensation plan where possible
```

لا تؤجل اكتشاف نقص السلطة إلى Final Review بعد تنفيذ الضرر.

## 5. Scope Contract وBlast Radius

ابدأ بـ:

```text
CLAIMED_OUTCOME
→ canonical owner
→ affected writers/readers/consumers
→ contracts/schema/data/runtime
→ surfaces/journeys
→ required failure/recovery paths
```

النطاق الحقيقي لا يحدده اسم الملف أو التطبيق وحده، بل:

```text
Root Cause
+ Blast Radius
+ Consumers
+ Dependencies
+ Contracts
+ Data Flow
+ Runtime Path
```

سجّل:

```text
IN_SCOPE
PROVEN_DEPENDENCIES
MUST_NOT_CHANGE
SUPPORTED_EXCLUSIONS + reason + reopen trigger
```

اسم التطبيق/الصفحة/الملف نقطة بدء وليس حدًا إذا أثبتت العلاقات امتداد النطاق.

أي Finding جديد:

```text
related → يدخل النطاق ويُعالج
proven unrelated → exclusion موثق + evidence + reopen trigger
uncertain materially → remains OPEN until resolved
```

لا توسّع المهمة إلى تنظيف عام غير مرتبط، ولا تضيقها لتجنب إصلاح أثر حقيقي.

## 6. SHA / Candidate lifecycle

استخدم المصطلحات التالية بمعنى واحد فقط:

```text
STARTING_REMOTE_SHA = TARGET_REF head at task start
WORK_BASE_SHA       = latest reconciled head used to build current delta
IMPLEMENTATION_SHA  = logical implementation commit; may be multiple
BOOKKEEPING_SHA     = optional derived package/document commit
FINAL_CANDIDATE_SHA = final immutable commit after every allowed write
LATEST_REMOTE_SHA   = latest re-resolved TARGET_REF head
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
MERGE_SHA           = only if an explicitly authorized merge actually occurs
```

أي write بعد `FINAL_CANDIDATE_SHA`:

```text
old candidate evidence becomes STALE where affected
→ new candidate
→ rerun invalidated evidence
```

### Package bookkeeping paradox

ممنوع:

```text
verify → write final evidence into repo → new SHA → verify → write again forever
```

القاعدة:

1. كل package/product bookkeeping المطلوب يكتمل **قبل Freeze**.
2. بعد Freeze لا source/package/format/generation commit جديد.
3. Final Evidence Matrix/decision يمكن أن تكون read-only output مرتبطة بالـCandidate.
4. Validator PASS يثبت ما يفحصه Validator فقط.
5. إذا closure validator يحتاج mutation، نفّذها قبل Freeze ثم أعد evidence المتأثر.

## 7. حل AUTO حتميًا

### EXECUTE_PACKAGE

```text
STARTING_REMOTE_SHA = current TARGET_REF head
WORK_BASE_SHA = latest safe reconciled head
BASE=AUTO = package pinnedStartSha .. FINAL_CANDIDATE_SHA for total task review
CANDIDATE=AUTO = FINAL_CANDIDATE_SHA after Freeze only
```

`pinnedStartSha` historical baseline، وليس push baseline إذا تحرك الفرع.

### EXECUTE_DIRECT

```text
STARTING_REMOTE_SHA = head before first task write
WORK_BASE_SHA = latest reconciled head
BASE=AUTO = STARTING_REMOTE_SHA .. FINAL_CANDIDATE_SHA
CANDIDATE=AUTO = FINAL_CANDIDATE_SHA after Freeze
```

### REVIEW_CANDIDATE

```text
CANDIDATE=AUTO → resolve TARGET_REF once to exact 40-SHA and freeze it
BASE=AUTO → derive only from explicit task/package/review provenance
```

لا arbitrary parent ولا guessed default branch. Base غير المثبت = evidence gap.

## 8. Candidate existence / reachability / relation

قبل الحكم أثبت:

```text
candidate exists
candidate full immutable SHA
candidate reachable relation to TARGET_REF
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA ?
candidate reachable from TARGET_REF ?
```

يمكن مراجعة commit أقدم مقصودًا، لكن لا تدّع إغلاق **الرأس الحالي** إذا كان الرأس مختلفًا.

## 9. Workspace / staging hygiene

قبل أول تعديل:

```text
record LOCAL_WORKSPACE_ID
record current branch/ref
record PRE_EXISTING_LOCAL_CHANGES including untracked
record intended paths/symbols/hunks
```

القاعدة:

```text
foreign/pre-existing change ≠ this agent's change
```

ممنوع افتراضيًا عندما قد يلتقط أو يمحو تغييرات أجنبية:

```text
git add .
git add -A
git commit -a
git checkout -- .
git restore .
git reset --hard
git clean -fd
```

قبل كل commit:

```text
inventory working tree
→ allowlist exact owned paths/hunks
→ stage explicit paths/hunks
→ inspect staged diff
→ inspect untracked/foreign delta again
→ commit one coherent logical boundary
```

حتى نفس الملف قد يحتوي hunk لوكيل آخر؛ path ownership وحده غير كافٍ.

## 10. Concurrent-Agent Isolation

```text
PARALLEL AGENTS ARE ALLOWED.
PARALLEL PUSH ASSUMPTIONS ARE NOT.
```

الأفضل محليًا:

```text
ONE WRITING AGENT = ONE ISOLATED WORKSPACE/WORKTREE/CLONE
```

قبل كل logical write/final commit/push:

```text
resolve LATEST_REMOTE_SHA
→ compare WORK_BASE_SHA → LATEST_REMOTE_SHA
→ inspect paths/symbols/contracts/schema/migrations/generated clients/truth owners
→ classify concurrent delta
```

التصنيف:

```text
DISJOINT
RELATED_NON_CONFLICTING
SEMANTIC_OVERLAP
DIRECT_CONFLICT
AUTHORITY_OR_TRUTH_CHANGE
```

المعالجة:

```text
DISJOINT
→ carry forward on latest head
→ rerun only evidence invalidated by shared context

RELATED_NON_CONFLICTING
→ reconcile assumptions + affected checks

SEMANTIC_OVERLAP
→ re-diagnose owner/readers/writers/contracts/state
→ rebuild delta on latest head
→ reverify

DIRECT_CONFLICT
→ no push
→ intentional resolution on latest head
→ new candidate

AUTHORITY_OR_TRUTH_CHANGE
→ reread authority/Product Truth/contracts
→ re-diagnose before write
```

Sibling commits من نفس base وتلمس نفس path/hunk/symbol هي على الأقل `SEMANTIC_OVERLAP`. لا textual auto-merge لمجرد أن Git يستطيع الدمج.

## 11. Atomic GitHub Remote/API writes

**Contents API file SHA ليس branch-head Compare-And-Swap.**

لـlogical multi-file/final write فضّل عند توفره:

```text
resolve latest head
→ create blobs/tree against exact base
→ create commit with exact expected parent
→ re-resolve TARGET_REF
→ non-force fast-forward update_ref
```

إذا تحرك الفرع: لا Force. reconcile وابنِ commit جديدًا على latest head.

استخدم per-file Contents API فقط عندما لا يتوفر atomic tree/commit path أو التغيير محدود ومخاطره مقبولة:

```text
re-resolve before batch
→ write one owned file/logical unit
→ re-resolve immediately after
→ compare any movement before next write
```

Partial multi-file API write ليس نجاحًا؛ أكمل/rollback بأمان أو سجله كFinding مفتوح.

## 12. Push serialization

```text
many agents may prepare in parallel
→ one final writer at a time by optimistic reconciliation
→ candidate parent = latest reconciled head
→ re-resolve immediately before push/ref update
→ fast-forward-safe update only
→ re-resolve immediately after push
```

إذا تحرك الفرع بين verification والدفع:

```text
DO NOT PUSH STALE CANDIDATE
→ compare/reconcile movement
→ rebuild candidate
→ rerun invalidated evidence
```

## PHASE A — EXECUTE_AND_VERIFY

## 13. Findings Ledger — لا Finding يضيع

من أول تشخيص وحتى القرار احتفظ بسجل حي لكل Finding مادي:

```text
finding_id
severity
category
first_seen_sha/run
claim_affected
exact path/symbol/evidence
root cause or missing proof
blast radius
owner
required fix/evidence
status = OPEN | FIXED_PENDING_VERIFY | PROVEN_CLOSED | NOT_APPLICABLE
reopen trigger
```

لا تحذف Finding لأنه اختفى من آخر log. لا `PROVEN_CLOSED` إلا بدليل حديث على Candidate صالح.

Final decision ممنوع مع أي `OPEN` أو `FIXED_PENDING_VERIFY` داخل النطاق.

## 14. Root-Cause Execution Loop

لكل فشل:

```text
FAILURE
→ classify evidence
→ correlate duplicates/symptoms
→ identify first causal failure
→ re-diagnose canonical owner/root cause
→ challenge competing hypothesis
→ fix owner/source
→ migrate all affected consumers
→ remove obsolete/parallel path
→ targeted verify
→ affected verify
→ search deliberately for adjacent regressions
→ update Findings Ledger
→ continue until exhausted
```

لا Patch loop بلا فرضية جديدة.

الإصلاح الجذري:

```text
symptom
→ canonical truth/write owner
→ proven root cause
→ target state
→ central fix/refactor/redesign if needed
→ writers/readers/consumers migration
→ contracts/generated artifacts synchronization
→ data/migration transition where needed
→ remove dead/legacy/duplicate path
→ persisted canonical readback
→ runtime proof
```

ممنوع:

```text
temporary patch
silent fallback
parallel truth
permanent dual-write without migration contract
surface-local business truth duplicating canonical owner
fake control/UI-only auth
test/guard weakening
state bypass
legacy route left reachable after migration
new financial retry identity before unknown-result reconciliation
```

إذا كان Root Cause في Architecture/Design/Data Model/Schema/Contract/Ownership/Responsibility/State/Permissions/Integration Boundary/Abstraction/Dependency Direction/Source of Truth/Legacy Design، فنفّذ Refactor/Redesign/Rebuild اللازم؛ لا تحفظ تصميمًا ثبت خطؤه لمجرد تقليل الـdiff.

## 15. CI / Runtime Failure Loop — لا Blind Rerun

لكل Workflow/Runtime failure:

```text
run SHA
→ workflow/profile
→ job
→ FIRST REAL FAILED STEP/phase
→ exact log/artifact
→ classify
```

التصنيف:

```text
DETERMINISTIC_PRODUCT
DETERMINISTIC_TEST_OR_CONTRACT
INFRA_OR_RUNNER
EXTERNAL_PROVIDER
FLAKY_OR_NONDETERMINISTIC
CANCELLED_OR_SUPERSEDED
STALE_RUN
```

القواعد:

```text
DETERMINISTIC → root-cause fix; rerun after NEW SHA
INFRA/PROVIDER → prove external cause before targeted rerun
FLAKY → flakiness itself is a defect until root cause/control is proven
CANCELLED/SUPERSEDED → neither PASS nor product FAIL; cannot prove closure
STALE_RUN → cannot prove current candidate
```

لا rerun متكرر لإجبار green. لا تشغيل Heavy CI مرتين لنفس Candidate إذا evidence نفسها ما تزال صالحة.

إذا فشلت عدة jobs:

```text
correlate first
→ one root cause may explain many failures
→ fix root cause
→ rerun minimum necessary invalidated checks
```

## 16. Full-Stack Multi-Surface Closure

تتبع بقدر الانطباق:

```text
Product Truth
→ Actor/Service Identity
→ Session/Device
→ Trusted Platform/Operator/Partner/Store/Assignment Scope
→ Role/Permission/Object authorization
→ Surface/Route/Screen/Control
→ shared controller/adapter
→ generated client/canonical contract
→ API/domain/state machine
→ validation/transformation
→ transaction/database
→ cache/idempotency
→ events/jobs/providers/WLT
→ networking/response
→ persisted canonical readback
→ every affected consuming surface
→ observable UI/operational result
→ audit/observability
→ runtime/startup/networking
```

غطِّ حسب الخطر:

```text
success
empty/missing data
invalid input
unauthenticated/denied
wrong scope / IDOR
forbidden state
not found
conflict/stale version
duplicate/replay/idempotency
boundary/min/max
race/concurrency
partial failure
dependency/database/network failure
restart/recovery
timeout/unknown result
retry/backoff/DLQ where relevant
offline/reconnect
old/new data
mixed-version compatibility
rollback/roll-forward
compensation/reconciliation
```

نجاح طبقة واحدة لا يثبت المسار الكامل.

## 17. Domain Gates

### Compatibility

```text
old-mobile + new-backend
new-mobile + old-backend when required
current control-panel + backend
generated client/event/cache compatibility
mixed-version behavior
feature-flag safe default
rollback/roll-forward
compatibility owner + expiry + removal trigger
```

### Security

auth/session/revocation/role/permission/trusted context/object auth/IDOR/cross-scope/service auth/input-output validation/injection/SSRF/path traversal/upload/PII/secrets/provider signature/replay/rate-limit/audit.

أي secret/PII في logs/artifacts/evidence يجب redaction له دون إخفاء الدليل المطلوب. لا تعرض credential خام في التقرير.

### Finance

WLT هو المالك المالي. لا parallel financial truth. أثبت:

```text
idempotency/correlation
state constraints
maker/checker/SoD where governed
canonical readback
provider outcome binding
unknown-result reconciliation
compensation
restart/replay safety
```

Mock/local success لا يثبت production finance/provider outcome.

### PostgreSQL / Data

```text
forward deterministic migrations only
constraints/indexes/FKs/checks
expand/backfill/switch/contract compatibility when needed
fresh DB + representative non-empty DB
drift/orphans/duplicates
locks/concurrency/idempotency
restart/partial failure
rollback/roll-forward
no applied-history rewrite
```

اختبارات البيانات لا تعتمد على بقايا run سابق لإعطاء PASS.

### Events / Jobs / Providers

```text
stable identity
duplicate/out-of-order/replay
outbox/inbox
retry/backoff/DLQ/lease
timeout/unknown result
provider auth/signature
reconciliation/compensation/restart
```

### UI / Mobile / Control Panel

غطِّ loading/empty/partial/success/error/forbidden/conflict/stale/offline/retry/recovery + persisted readback.

Mobile عند الانطباق:

```text
native permissions
deep links
push
maps/location
SecureStore/session
offline/reconnect
build/OTA/EAS/env/runtime transport
physical-device vs emulator proof limit
```

Control Panel عند الانطباق:

```text
route/object auth
trusted scope
server/client boundary
search isolation
bulk operations
audit/session/error/readback
responsive/RTL/localization/accessibility
```

التحقق من Surface مرئية يشمل صحة UX/UI/الحالات والتصميم المتسق حيث يدخل ذلك في Claim؛ صحة API وحدها لا تثبت صحة التجربة.

### Dependencies / Supply Chain / CI

عند تغير dependency/workflow/tooling:

```text
lockfile integrity
unsupported/duplicate dependency
license/policy if governed
CVE/dependency review
CodeQL where applicable
Gitleaks/secrets
workflow pinning/actionlint/zizmor/policy guards
```

لا تجعل scanner أخضر بإسكات finding دون معالجة السبب أو إثبات false positive وفق policy.

## 18. Runtime Freshness وState Isolation

Runtime proof لا يُقبل إذا كان من الممكن أن يكون شغّل كودًا أو بيانات stale.

قبل runtime/E2E حسب الانطباق أثبت:

```text
source checkout SHA = candidate SHA
built artifact/image/bundle provenance = candidate SHA or exact derived digest
service/process/container version is current
migrations/schema at required version
required seeds/fixtures provenance known
no stale dev server/container/process masking new code
network endpoints/config/env correspond to intended profile
```

عند الحاجة:

```text
rebuild/restart exact affected services
clear only safe derived caches
use unique test run identifiers
capture pre-state
execute scenario
read canonical persisted post-state
clean test data safely or prove isolated disposable environment
```

ممنوع نجاح يعتمد على بيانات باقية من run سابق أو fixture لا يمر بالمسار الحقيقي المدعى.

## 19. Verification Strategy — affected first, risk-proportional

اقرأ commands الحقيقية من manifests/scripts/workflows/registries، ولا تخترع command.

```text
nearest root-cause regression
→ unit/package
→ related integration
→ affected typecheck/lint/test/build
→ contract/generated client
→ DB/data/security/isolation
→ runtime/readiness/smoke/canonical readback
→ cross-surface E2E/manual visual when claimed
→ failure/edge/adversarial checks
→ full workspace/runtime only when impact/policy requires
```

لكل Check:

```text
exact command/source
candidate_sha
run/artifact id
started/completed time when available
environment/profile/runner
exit/status
claim it can falsify
what it does NOT prove
```

Build/Lint/Typecheck/Unit/CI جزئي لا يثبت End-to-End تلقائيًا.

الاختبار النهائي يجب أن يمر عبر **Actual Scenario** الحقيقي إذا كان الـClaim تشغيليًا؛ Mock/isolated proof يبقى محدودًا.

إذا تغير test/guard نفسه ضمن الإصلاح، أثبت أنه:

```text
fails on the broken behavior or equivalent regression fixture
passes after the root fix
was not weakened to accept the bug
```

## 20. Evidence Invalidation Rules

أي mutation أو concurrent movement قد يبطل evidence. سجّل لكل evidence:

```text
bound_candidate_sha
inputs/environment
covered scope
invalidated by: paths/contracts/schema/runtime/data/config/authority changes
```

لا تعِد كل شيء بلا سبب، ولا تحتفظ بدليل صار stale.

إذا تغير:

```text
contract/schema → rerun consumers + generation + integration
migration/data owner → rerun DB/runtime/readback
runtime/config/network → rerun runtime/E2E affected
security/auth/permission → rerun negative isolation/security paths
shared library → rerun all proven consumers
only unrelated docs → retain unaffected evidence if provenance proves independence
```

## 21. EXECUTE_PACKAGE current-schema projection

اقرأ package/framework/schema/generator/validator الحاليين.

أي field قديم غير معروف حاليًا:

```text
DERIVED_LEGACY_METADATA
```

وصف فقط؛ لا يخلق scope/requirement/approval.

### Revalidate package assumptions before product writes

استخرج الافتراضات والقرارات وFindings والOwners وPaths من الحزمة، وصنف كل عنصر:

```text
CONFIRMED_CURRENT
STALE
CONTRADICTED
NEEDS_EVIDENCE
RESOLVED_DECISION
MATERIAL_DECISION_GAP
```

`STALE/CONTRADICTED/NEEDS_EVIDENCE` لا ينتقل إلى التنفيذ كحقيقة. `MATERIAL_DECISION_GAP` يمنع تنفيذ الجزء المتأثر حتى يُحسم؛ لا تخمّن.

### No-shell structural preflight

إذا لا يوجد Shell:

```text
fetch current framework README + generator + validator
→ fetch required package roots
→ enumerate registered units
→ fetch required unit files
→ validate shape/markers/dependencies/verification links as far as provable
```

لا تدّع Validator PASS بلا تشغيله.

### Stale package

```text
limited drift → reconcile affected assumptions only
material authority/framework/schema/root-cause drift → rebaseline/re-diagnose current target
```

لا replay ميكانيكي لمئات commits لمجرد الحفاظ على package قديم.

Seeded Coverage assessment ledger، وليس mandate لمسح كامل المستودع.

## 22. Package Bookkeeping قبل Freeze

في Package mode حدّث الحقيقة التنفيذية فقط وفق Schema الحالي:

```text
results/checks/blockers/deviations/order/coverage/latest observed state
```

لا تكتب `CLOSED_WITH_EVIDENCE` أو أي final approval state استباقيًا.

ولا تجعل تحديث Package نفسه مصدر Truth جديدًا؛ هو سجل مشتق يجب أن يشير إلى evidence/candidate الفعلي.

## 23. Cleanup / Refactor / Structural Finishing جزء من DONE

بعد إزالة السبب وقبل Freeze:

```text
remove dead/unreachable/obsolete/duplicate code
remove retired routes/exports/imports/re-exports/configs/dependencies
remove unnecessary compatibility/fallback/workaround layers
remove stale TODO/FIXME/HACK related to scope
remove orphan generated artifacts/references
unify canonical source of truth
simplify duplicated logic
remove old names/paths/aliases after migration
verify no legacy path remains reachable
verify docs/comments/examples touched by the scope describe current truth
```

**وحدة التنظيف ليست الملف.** افحص حسب الحاجة:

```text
line
→ condition/branch/block
→ function/method/type/component/helper
→ file/file group/folder
→ module/package
→ service/surface/domain
→ contract/route/config/dependency
```

لكل عنصر باقٍ داخل النطاق يجب أن يمكن تبرير:

```text
Responsibility
Purpose
Consumer
Requirement
Architectural Reason
Correct Ownership
Correct Placement
Correct Naming/Context
```

بعد أي Delete/Rename/Move/Merge/Split/Refactor/Replace افحص شبكة المراجع كاملة في الاتجاهين: imports/exports/callers/callees/bindings/routes/contracts/schemas/config/env/dependencies/tests/mocks/fixtures/docs/build/CI/scripts/generated references.

Cleanup غير المرتبط بالنطاق لا يُسحب عشوائيًا إلى المهمة؛ لكنه يصبح in-scope إذا كان بقايا مباشرة من السبب/الإصلاح أو يخلق ambiguity/parallel truth داخل المسار المتأثر.

## 24. Final Latest-Head Integration قبل Freeze

```text
inventory exact owned delta
→ latest-head semantic reconciliation
→ rebuild/apply on latest safe head
→ inspect exact diff + foreign/out-of-scope delta
→ complete package bookkeeping
→ run targeted affected verification
→ create final logical commit(s)
→ re-resolve TARGET_REF
```

إذا agent آخر دفع: أعد بوابة reconciliation قبل تسمية Candidate نهائي.

## 25. Delivery Boundary

`LOCAL_ONLY`:

```text
no commit/push
final candidate may be local immutable commit only if explicitly created/allowed;
otherwise decision must state the proof limit
```

`COMMIT`:

```text
commit exact owned delta only
no push
```

`COMMIT_AND_PUSH`:

```text
commit exact owned delta
→ latest-head reconcile
→ fast-forward-safe push
→ re-resolve remote head
```

لا `MERGE/RELEASE/DEPLOY` إلا إذا طلبت صراحةً وكان authority gate مستوفى.

## PHASE B — FREEZE_AND_FINAL_VERIFY

## 26. Freeze

```text
FREEZE WRITES
→ FINAL_CANDIDATE_SHA = exact last allowed commit
→ verify existence/reachability/head relation
→ no source/package/format/generation/commit/push mutation during final evidence
```

أي write لاحق = Candidate جديد وعودة إلى Phase A.

## 27. Final Cleanup + Hardening + Red-Team Review

على Candidate المرشح ابحث عمدًا عن عيب، لا عن سبب لقبول النتيجة:

```text
unclosed root cause
parallel/stale truth
hidden writer/reader
missing consumer/migration
contract/binding mismatch
security/authz bypass
cross-scope/IDOR
retry/replay/concurrency bug
unknown-result/recovery gap
partial failure/restart gap
runtime-only defect
stale process/container/data
flaky test
weak/modified guard
missing audit/observability
foreign/out-of-scope delta
legacy/dead/reachable path
PII/secret leakage
regression on neighboring consumer
wrong ownership/placement/naming/context
orphan/stale references
stale config/env/dependency
unnecessary file/folder/residue
cross-surface inconsistent behavior
```

أي Finding يحتاج كتابة يعيد Phase A.

## 28. Final Read-Only Verification

على `FINAL_CANDIDATE_SHA` فقط:

```text
required final checks
→ generated consistency without mutation
→ exact diff/scope/foreign-change review
→ canonical persisted readbacks
→ runtime/E2E evidence where claimed
→ security/data/finance gates where applicable
→ failure/edge/adversarial behavior
→ test-effectiveness review
→ evidence/artifact provenance verification
```

ممنوع أثناء هذه المرحلة:

```text
--fix
formatter write
generation write
cleanup apply
lockfile/migration mutation
source/package write
commit/push/merge
swallowed exit code
```

## 29. Evidence Provenance + Artifact Integrity

كل دليل نهائي يجب أن يثبت ارتباطه بنفس Candidate:

```text
candidate SHA
workflow/run/job or command id
artifact/log source
runner/environment/profile
status/exit
no cancellation/supersession
no mixing artifacts from another SHA/run
proof limit
```

إذا كانت evidence manual/visual فسجّل بقدر الانطباق:

```text
app/build version or commit
platform/device/emulator/browser
route/scenario
runtime endpoint/profile
observed result
capture timestamp
```

لا Screenshot بلا provenance يثبت runtime claim عالي المخاطر.

## 30. Branch-Race Gates

### Before push

```text
re-resolve TARGET_REF immediately
→ if head != candidate parent/latest reconciled base: DO NOT PUSH
→ reconcile
→ new candidate
→ rerun invalidated evidence
→ fast-forward-safe push only
→ re-resolve after push
```

### While CI is running

إذا TARGET_REF تحرك:

```text
running evidence remains bound to its original SHA
→ do not re-label it as evidence for the new head
→ classify movement
→ decide which checks must rerun on new candidate/head
```

### Before final decision

```text
HEAD_AT_DECISION = re-resolve TARGET_REF
compare HEAD_AT_DECISION with FINAL_CANDIDATE_SHA
```

إذا المطلوب إغلاق branch head وكان مختلفًا: لا تدّع closure حتى reconcile/verify الرأس المطلوب.

## PHASE C — REVIEW_AND_DECIDE

## 31. Independence Provenance

```text
SELF_REVIEW ≠ INDEPENDENT_REVIEW
```

Git author/account وحده لا يثبت independence.

سجّل:

```text
independent reviewer identity/provenance proven? YES/NO
review bound to exact candidate SHA?
reviewer changed candidate after review started?
```

إذا المراجع أصلح Candidate، لا يعتمد إصلاحه كمراجعة مستقلة في الدورة نفسها إلا وفق policy حاكمة تسمح بذلك صراحةً.

## 32. Claim / Diff / Test Review

راجع `CLAIMED_OUTCOME` لا الملفات فقط:

```text
actors
surfaces
owners
states
scopes
permissions
contracts
persistence
providers
finance
readbacks
failure/recovery
compatibility
design/UX when claimed
evidence
approvals
```

راجع range كاملًا:

```text
changed files/commits
foreign/pre-existing delta
unexpected generated/lockfile changes
out-of-scope cleanup
missing consumer migration
legacy path reachable
unreviewed contract/schema/runtime effect
stale plan assumption accidentally implemented
```

لكل Test/Guard:

```text
what claim can it falsify?
can it pass while product remains broken?
real contract/db/runtime path?
negative/retry/concurrency/recovery coverage?
weakened/mocked/skipped/redirected/non-blocking?
root-cause regression when regressable?
```

## 33. Evidence Matrix

استخرج scopes من current decision vocabulary/delivery policy. لكل scope:

```text
scope
applicable? + reason
PASS | FAIL | MISSING | STALE | BLOCKED
source/command/run/artifact
candidate_sha
environment/profile
proof_limit
required capability
required approval domain/owner
```

CI/Build/Test/Validator لا يثبت scope آخر تلقائيًا.

## 34. Approval Matrix

حلها من authority contracts الحالية:

```text
approval_domain
required? + why
allowed approver identity/role
protected?
actual approver/provenance
exact candidate SHA bound?
evidence/audit source
SATISFIED | MISSING | UNPROVEN | NOT_APPLICABLE
```

Historical blanket authorization ليس outcome acceptance. Identity/provenance/candidate binding غير المثبتة = approval غير مثبت.

## 35. GitHub / CI / Repository-Platform Truth

عند الاعتماد على GitHub تحقق حيًا من Candidate نفسه:

```text
workflow runs
required checks
cancelled/superseded/stale runs
reviews and unresolved threads
live rulesets/branch protection
mergeability/base relation
required status context names
Sonar Quality Gate when applicable
CodeQL/security/dependency checks when applicable
```

Tracked workflow/config لا يثبت live enforcement.

`green` لا يعني مجرد عدم وجود red؛ pending/cancelled/missing required check لا يصبح PASS.

## 36. Package Validation Semantics

- لا تعتمد DONE/PASS داخل package كدليل مستقل.
- لا تعتمد Claims داخل `plans/**` كImplementation/Runtime Truth.
- شغّل current `--strict`/`--closure` فقط إذا أمكن فعليًا وبالصيغة الحالية.
- نجاح Validator يثبت فقط checks التي ينفذها.
- ممنوع استخدام Validator كبديل لـEvidence Matrix/Protected approvals/Runtime truth/Final closure.
- لا post-evidence package mutation داخل frozen candidate.

## 37. Retention

Package = `DERIVED_SUPPORT`.

بعد انتهاء الحاجة طبق repository retention policy:

```text
task-temporary
superseded
unconsumed
reproducible
```

يحذف فقط عندما يكون الحذف مفوضًا وآمنًا ولا يعتمد عليه runtime/build/ci/migration/governance/operations. Git history هو الأرشيف.

إذا حذف package جزء من final branch state، نفّذه قبل Final Freeze ثم أعد evidence المرتبط بالـSHA النهائي.

## 38. بوابة الإغلاق النهائية

قبل أي قرار إغلاق يجب أن تكون النتيجة:

```text
zero known fixable errors in scope
zero known gaps in scope
zero known contradictions in scope
zero known unresolved findings
zero known unverified fixes
zero known unjustified duplicate truth
zero known dead/legacy reachable path caused by the work
zero known contract/integration gaps
zero known unresolved runtime/data state
zero known regressions
zero known structural/naming/placement/context defects in scope
zero known orphan/stale references caused by or exposed by the work
zero known unnecessary legacy/residue directly tied to the scope
zero material unresolved decision gaps required for the claimed outcome
zero plan/package assertions treated as live truth without revalidation
zero required pending/missing/stale evidence
zero required missing/unproven approvals
```

إذا تعذر إثبات بند: OPEN/BLOCKED وفق current vocabulary، لا DONE.

`CLOSED_WITH_EVIDENCE` أو أي مرادف حاكم حاليًا لا يُستخدم إلا عندما تكون كل evidence scopes والموافقات المنطبقة مثبتة على **نفس immutable FINAL_CANDIDATE_SHA**، بلا fail/blocked/pending/missing/stale مطلوب، مع وضوح علاقة Candidate بالرأس الحالي.

## 39. التقرير النهائي

استخدم decision vocabulary الحالي فقط، وسجّل:

```text
repository / target_ref / mode
starting_remote_sha / work_base_sha / final_candidate_sha
head_at_review_start / head_at_decision / candidate-head relation
base_or_reviewed_range
package_or_task / claimed_outcome
source hierarchy + package revalidation result
resolved decisions consumed + any evidence-based reopenings
capability/tools/plugins actually used + limits
pre-execution approvals for protected/irreversible actions
scope / dependencies / supported exclusions
concurrent movements + classification + reconciliation
pre-existing/foreign change handling
root causes + canonical owners
changed/removed/moved paths + logical commit boundaries
contracts/clients/migrations/data changes
surfaces/journeys/readbacks
runtime freshness/state isolation proof
checks + proof limits + evidence invalidation/reruns
CI failure classifications + first real failed steps
test effectiveness / flakiness status
Findings Ledger final state
structural/cleanup/source-of-truth/reference review result
Evidence Matrix
Approval Matrix
same-candidate GitHub/CI evidence
independence provenance
package validation + proof limit
commits/push result
merge/release/deploy status if separately authorized
remaining blocker/missing evidence + exact resume point
retention action
final decision
```

## 40. القاعدة الذهبية

```text
SEARCH IS NOT TRUTH.
PLAN/PACKAGE IS NOT LIVE CODE OR RUNTIME TRUTH.
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
USE EVERYTHING APPLICABLE, NOT EVERYTHING EVERY TIME.
NO DUPLICATE HEAVY CI FOR THE SAME VALID CANDIDATE.
NO FAKE GREEN.
NO SILENT BRANCH SWITCH.
NO STALE RUNTIME.
NO FOREIGN CHANGE CLAIMED AS OWN.
NO PRODUCT/ARCHITECTURE GUESSING FOR AN UNRESOLVED MATERIAL DECISION.
NO MERGE/RELEASE/DEPLOY WITHOUT EXPLICIT AUTHORITY.
EVIDENCE MUST MATCH THE EXACT FINAL CANDIDATE SHA.
NO KNOWN FIXABLE IN-SCOPE DEFECT MAY REMAIN AT CLOSURE.
```
