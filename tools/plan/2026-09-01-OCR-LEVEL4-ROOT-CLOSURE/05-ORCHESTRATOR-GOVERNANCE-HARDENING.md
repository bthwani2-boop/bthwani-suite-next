# Orchestrator and Governance Hardening Proposals

These proposals are intended to strengthen the live orchestrator without creating a second assurance/control-plane authority. They should be integrated into the existing `00–05`/focus-module model only where they reduce ambiguity and recurrence.

**Campaign applicability note:** the current OCR Level-4 closure campaign is explicitly `SINGLE_SESSION_DIRECT_ON_OCR`. Any multi-agent/write-lease concept described as a future governance capability is **not active execution authority for this campaign** and must not create Session A/B/C lanes, temporary execution branches, or parallel mutation worktrees.

---

# 1. Authority Uniqueness Ledger — REQUIRED

Add a machine-readable repository ledger for material semantic truths.

Suggested fields:

```text
semantic_id
canonical_owner
canonical_writer
canonical_contract
canonical_storage
allowed_read_projections[]
forbidden_writers[]
```

Examples:

```text
order.lifecycle          → DSH Orders
serviceability.policy    → DSH Policies/Service Areas
wallet.balance           → WLT
workforce.profile        → Workforce
identity.session         → Identity
provider.credentials     → Providers
platform.rollout         → Platform-Control
```

Invariant:

```text
material mutable semantic_id has exactly ONE canonical writer
```

Derived/reference consumers may be many but cannot be promoted into writers.

This catches the class of defects that grep alone misses: two files can use different words yet own the same decision.

---

# 2. Semantic Duplicate/Shadow Authority Scan — REQUIRED

Add a focus-module step that searches for semantic duplication patterns, not only textual duplication:

- copied enums;
- copied state/transition tables;
- duplicated `allowedActions` logic;
- frontend legality derived from raw status;
- duplicated defaults/currency/locale domains;
- duplicated policy thresholds;
- manually mirrored DTO/error/role vocabularies;
- comments such as `mirror`, `keep in sync`, `single source of truth`, `canonical` outside the proven owner.

Every match is correlated to the Authority Ledger.

The result should be:

```text
OWNER
DERIVED_PRESENTATION
GENERATED
MIGRATION_BOUNDED
VIOLATION
```

---

# 3. Compatibility TTL / Removal Ledger — REQUIRED

Every compatibility path must be explicitly temporary and measurable.

Required metadata:

```text
compat_id
old_authority
new_authority
old_writers
old_readers
migration_id
inventory_count
cutover_condition
removal_condition
owner
introduced_sha
```

No compatibility code is allowed to reach fixed point without a removal disposition.

If `inventory_count == 0` and `old readers/writers == 0`, deletion becomes mandatory.

This should cover:

- storage keys;
- old API routes/aliases;
- env aliases;
- schema projections;
- legacy queue readers;
- old DTO fields;
- old database columns/tables through forward migration;
- compatibility adapters.

---

# 4. Filesystem Responsibility Manifest — REQUIRED for repository scope

For every immediate repository subtree and every material shared/core/infra/service subtree, record one responsibility and owner.

Example:

```text
shared/data-runtime      runtime/query/storage adapters
shared/ui-kit            generic visual primitives/design system
shared/control-panel     CP-specific presentation/composition
infra/docker             executable container runtime composition
core/providers           provider config/credential/health authority
```

Rules:

- a directory with no unique responsibility must be merged/deleted;
- a directory with multiple unrelated responsibilities must be split by owner;
- vague `common/helpers/utils/misc` roots require explicit proof;
- tracked `history/archive/backup/tmp/old` directories are prohibited in active source trees unless a policy explicitly proves a material purpose.

---

# 5. No Fabricated Truth Invariant — REQUIRED

Add an explicit product/code law:

```text
missing != ready
error != empty
unknown != eligible
unavailable != zero
unproven != false
```

A UI/API adapter may not create plausible business truth merely to keep a journey moving.

Examples prohibited:

- profile 404 → locally fabricated profile defaults;
- metrics read failure → zero metrics;
- missing distance → serviceable;
- failed list read → empty list;
- unknown financial close status → closable.

Require discriminated/error-aware state at boundaries.

---

# 6. Generated Boundary Rule — REQUIRED

If canonical OpenAPI/generated DTO differs from runtime/product semantics:

**fix contract/runtime owner and regenerate**.

Forbidden as final closure:

```text
GeneratedType & { missingWireFields... }
Omit<GeneratedType, ...> & { repairedFields... }
manual enum additions to generated wire enum
manual copy of generated request/response DTO
```

Pure presentation view models derived from generated types remain allowed if they do not claim wire/business authority.

A mechanical repository check should flag those repair patterns in directories that import generated clients.

---

# 7. Single-Session Exact-HEAD Mutation Protocol — REQUIRED for this campaign

Current campaign mutation fields:

```text
EXECUTION_MODE=SINGLE_SESSION_DIRECT_ON_OCR
TARGET_BRANCH=ocr
ACTIVE_MUTATION_SESSIONS=1
PINNED_PARENT_SHA
ROOT_ID
CANONICAL_OWNER
AFFECTED_CONE
REMOTE_HEAD_CONCURRENCY_RISK
```

Before each material write checkpoint:

- compare live remote `ocr` SHA to the pinned parent;
- if remote moved, fetch and compare the intervening delta;
- invalidate overlapping diagnosis/evidence;
- re-pin and re-diagnose before continuing;
- never force-push over intervening work.

The campaign must not create Session A/B/C lanes, execution worktrees, temporary root branches, or parallel material mutation sessions. Repository-wide roots are completed serially by causal priority in the same session.

A general multi-agent write-lease protocol may remain a future orchestrator capability, but it is **NOT APPLICABLE** to this campaign unless the human explicitly changes execution mode in a later instruction.

---

# 8. Deletion Closure Ledger — REQUIRED

For each closure unit, require an explicit `EXPECTED_DELETIONS` section.

After treatment, executor must report:

```text
files deleted
folders removed
routes removed
contracts removed
writers removed
readers removed
compat keys removed/purged
tests/fixtures removed or migrated
generated outputs removed/regenerated
```

If expected deletion is zero for a root that replaces a parallel/legacy authority, the verifier should challenge the root: why did nothing old disappear?

This prevents “new correct layer added, old wrong layer retained”.

---

# 9. Evidence Provenance on Readiness/Closure Metadata — REQUIRED

Static manifests/status maps are useful only if they cannot become manual green truth.

Any field equivalent to:

```text
ready
verified
closed
runtime-verified
implemented
production-ready
```

must either be derived, or be accompanied by exact evidence provenance:

```text
evidence_sha
evidence_kind
evaluated_at
required_cells
open_cells
```

When evidence is stale or absent, status fails closed.

Do not require this for ordinary descriptive implementation metadata that does not claim verification.

---

# 10. Plan Artifact TTL — REQUIRED

`tools/plan` must not become a graveyard of competing “final” reports.

Rule:

- one active execution package per campaign/branch scope;
- every package says it is non-canonical and names the exact starting SHA;
- when superseded, extract durable lessons to governance and delete the old package;
- after campaign closure, delete execution-only plans unless a narrow ongoing operational reason exists.

Git history provides provenance.

---

# 11. Naming/Path Quality Gate — REQUIRED in finishing audit

Flag path/file names that frequently conceal responsibility:

```text
common
helpers
utils
misc
legacy
old
history
archive
tmp
temp
backup
copy
new
final
v2/v3
experimental
prototype
```

A flag is not automatic deletion. It requires one of:

```text
rename to concrete responsibility
split by owner
bounded migration justification
delete
false positive with reason
```

This should also check branch/date-specific “canonical/final architecture” documents living next to executable code.

---

# 12. Error-State Algebra Rule — REQUIRED for async product boundaries

Standardize semantic distinction:

```text
idle
loading
ready(data)
empty
missing
forbidden
unavailable
recoverable-error
terminal-error
unknown-outcome
conflict
```

Not every screen needs all states, but a failure must never collapse into `empty`, and unknown mutation result must not be rendered as success/failure without canonical evidence.

This can be implemented as domain-specific discriminated unions, not a mega-framework.

---

# 13. Migration Residue Rule — REQUIRED

Distinguish two things clearly:

### Keep

Historical DB migrations needed for fresh install/supported upgrade.

### Remove after zero inventory

Runtime migration compatibility such as:

- old local-storage readers;
- V2/V3 queue parsers;
- dual schema read paths;
- old API aliases;
- conversion shims.

Each runtime migration path needs data inventory + removal condition.

---

# 14. Surface Promotion Gate — REQUIRED

A surface cannot change from `fix-required` to `runtime-verified` from a manual edit alone.

Required evidence cells:

```text
actor/session
navigation
permission/object scope
network
persistence/readback
loading
empty/missing
error/forbidden
retry/recovery/offline
RTL/localization
accessibility/device/viewport
cross-surface handoffs
```

The status should be derived from the required cell set where practical.

---

# 15. Exact HEAD Concurrency Lock — REQUIRED

Before any mutation/commit/push in this campaign:

```text
expected_remote_sha == actual_remote_sha
```

If false:

```text
fetch
→ compare delta
→ invalidate overlapping assumptions/evidence
→ re-pin on current origin/ocr
→ safely reapply/rebase only if still root-correct
→ re-diagnose
```

Do not allow the single execution session to continue writing against a stale semantic baseline just because Git can later merge the text.

---

# 16. Root-Correct “No Third Authority” Rule

When removing two duplicate truths, do not reflexively solve them by creating a third shared mapping that simply centralizes duplication.

Ask first whether the semantic mismatch itself can be eliminated.

Examples:

```text
legacy fulfillment vocabulary → canonical fulfillment vocabulary everywhere
rather than frontend map + backend map → shared third map
```

and

```text
runtime DTO vs generated DTO → canonical contract regenerated
rather than add a shared manual repaired DTO package
```

---

# 17. Required additions to closure-unit template

Every material root execution contract should include these fields explicitly:

```text
ROOT_ID
SEVERITY
ACTUAL_SOURCE_OF_DEFECT
ACTUAL_SOURCE_OF_FIX
CANONICAL_OWNER
CANONICAL_WRITER
AFFECTED_CONE
WRITER_INVENTORY
READER_CONSUMER_INVENTORY
DATA_INVENTORY
MIGRATION_BACKFILL_RECONCILIATION
CUTOVER
EXPECTED_DELETIONS
NEGATIVE_SPACE_SEARCH
TARGETED_VERIFICATION
EVIDENCE_INVALIDATION
REMOTE_HEAD_CONCURRENCY_CHECK
FIXED_POINT_REOPEN_CONDITIONS
```

This turns cleanup, filesystem ownership and exact-HEAD concurrency safety into first-class closure requirements instead of optional prose.

---

# 18. What NOT to add to the orchestrator

Do not create:

- another orchestration framework beside the current one;
- hundreds of mandatory gates that do not change root diagnosis;
- generic mega-state abstractions across unrelated domains;
- automatic deletion based only on filename;
- static architecture documents that restate live contracts as a second truth;
- a requirement to rerun the whole repository after every small edit.

The desired upgrade is **stronger invariants + clearer ownership + mechanical negative-space checks**, while preserving Minimum Necessary Complexity and root-driven verification.
