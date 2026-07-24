# 12 — Multi-Journey Selection & Slice-by-Slice Sequencing

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v3
**File:** `12 of 13`
**Harvested from:** `governance/prompting/unified-operational-journey-execution-command.md` (a non-authoritative, unregistered usage template — see its header note). This file generalizes and merges its durable, ref-neutral, journey-neutral rules. It does not import that template's `write_authorization` block, its `journey_registry`/`journey_selection` example values, or its non-canonical result vocabulary.

**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)

> Governing rule: this file is part of a 13-file package. It is never used alone to declare acceptance. Any acceptance returns to `00_INDEX_AND_COVERAGE.md`, then applies every relevant file, including `10_EXECUTION_PLAN_NO_SKIP_GATE.md` and `11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---

## 37) Scope of this file

Files `01`–`11` define what a single journey/topic must prove. This file adds the missing layer above that: how to work through **a range of journeys** (for example `JRN-005..JRN-010`) from a living journey registry, one journey at a time, and how to decompose a single journey into **vertical slices** that close one at a time instead of being treated as one large undifferentiated unit.

This file does not create new authority. It generalizes sequencing discipline that was previously only described informally. The registry itself, `governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md`, remains `ACTIVE_CANONICAL` and outranks this package (see `governance/authority/authority-precedence.json`).

---

## 38) Journey selection from the live registry

Before opening any journey:

1. Open `governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md` at the resolved commit. Never use journey names, IDs, or scopes recalled from memory or from a prior session.
2. Extract, for each journey in the authorized selection: official name, owning service, related services, registered functional slices.
3. Determine execution order by operational dependency, not by numeric ID order alone.
4. Open exactly one journey at a time. Do not open a second journey while the first has open slices.
5. When execution surfaces a capability, contract, operation, migration, route, screen/tab, state transition, affected surface, or DSH/WLT relationship that is not registered, that is a **registry gap** and must be added before the journey can close (see `06_ORGANIZATION_PERFORMANCE_CLEANUP_SEQUENCE.md` §17.14 `journey_sequence_matrix`).
6. Never delete historical journeys from the registry. Use `MERGED_INTO`, `RETIRED`, or `OUT_OF_SCOPE_FOR_THIS_JOURNEY` (the canonical decision-vocabulary value) with a reason and reference.

A range such as `JRN-005..JRN-010` authorizes execution of exactly those journeys, in order, without requiring a fresh approval between journeys inside that same range — but it does not authorize opening any journey outside the range, and it does not by itself authorize Git/GitHub write actions (see `02_REMOTE_REF_SOURCE_GIT_GATES.md` §5 for what does).

---

## 39) Fixed functional slices FS-01..FS-18

In addition to any slices registered specifically for a journey, apply this fixed baseline set wherever applicable to the journey's scope:

```text
FS-01  User intent and entry points
FS-02  Navigation and routing
FS-03  Primary data list/read surface
FS-04  Primary detail/read surface
FS-05  Create/mutate primary entity
FS-06  Update/edit primary entity
FS-07  State transitions and lifecycle
FS-08  Permissions and role-based visibility
FS-09  Search, filter, sort, pagination
FS-10  Validation and error surfaces
FS-11  Notifications and feedback
FS-12  Cross-surface readback and refresh
FS-13  DSH/WLT financial boundary (read-only refs in DSH, mutation only in WLT)
FS-14  Tenant/SaaS context propagation where `saas_context.mode != NOT_APPLICABLE`
FS-15  Empty/loading/offline/blocked/forbidden/conflict states
FS-16  Audit trail and event/outbox
FS-17  Negative and edge-case scenarios
FS-18  Runtime/CI targeted verification
```

Rules:

- A journey does not need every FS-01..FS-18 slice to apply. A non-applicable slice is recorded `NOT_AFFECTED_WITH_REASON`, not silently dropped.
- Additional slices forced by contracts, migrations, routes, screens, states, events, or integrations are appended after the fixed set, ordered by dependency.
- It is forbidden to group slices horizontally by layer (`do all frontend, then all backend, then all database`). Every slice is vertical: one feature/use-case → every layer it touches → every surface it touches → its own verification → its own closure.

---

## 40) Sequential slice closure

Mandatory sequence per journey:

```text
pin journey scope
→ extract every slice for the journey (registered + FS-01..FS-18 + discovered)
→ order slices by operational dependency
→ open exactly one slice
→ diagnose the slice's gaps
→ find root cause and correct truth owner
→ fix the live code
→ complete binding across every affected layer and surface
→ clean obsolete/duplicate/noise scoped to the slice
→ run the smallest sufficient targeted verification
→ resolve every failure
→ re-verify after the last edit
→ prove slice closure
→ commit and push once the logical unit is complete, under whatever write authorization already governs this task (see `02_REMOTE_REF_SOURCE_GIT_GATES.md` §5 — this file does not grant that authorization by itself)
→ re-pin the branch head
→ move to the next slice
→ repeat until the last slice closes
→ run final integration verification for the whole journey
→ apply the journey-level zero-gate
→ issue the journey decision
→ move to the next authorized journey only
```

### 40.1 Slice-open gate

Before opening any slice, the previous slice must already be: actually implemented, re-verified after its last edit, free of fixable internal gaps, not dependent on a mock or a production fallback, logically integrated with the shared brain/contracts/backend, pushed once its logical unit was complete, and recorded with a clear result. Never hold two slices open at once.

### 40.2 Per-slice zero-gate

A slice cannot close, and the next slice cannot open, while any applicable value below is nonzero:

```yaml
slice_internal_gaps: 0
slice_unbound_controls: 0
slice_unbound_components_or_files: 0
slice_frontend_backend_disconnections: 0
slice_frontend_only_features: 0
slice_backend_only_features: 0
slice_contract_mismatches: 0
slice_request_response_mismatches: 0
slice_status_mismatches: 0
slice_permission_mismatches: 0
slice_error_mapping_mismatches: 0
slice_duplicate_truth_owners: 0
slice_local_surface_business_logic: 0
slice_raw_surface_api_calls: 0
slice_runtime_mock_truths: 0
slice_obsolete_code: 0
slice_failed_required_checks: 0
slice_unverified_required_behavior: 0
```

This is the same family of zero-tolerance conditions already defined at journey scope in `11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md` §`frontend_backend_integrity_gate`, applied per-slice instead of only at journey level, so a broken slice cannot hide inside an otherwise-passing journey until the very end.

If a slice's verification fails: the slice stays open, the failure is fixed immediately, verification re-runs, and the gap is never deferred to a later slice or a later journey and never logged as a "future improvement" while it remains fixable in scope.

### 40.3 Journey-close gate

A journey is not complete because most of its slices closed, and not complete because a build or a generic workflow passed. It requires: every registered and every discovered slice closed; the registry updated with any newly discovered slices; cross-slice read/write/state-transition coherence verified; the full end-to-end journey scenario executed; applicable negative/edge scenarios passing; targeted integration checks passing; the journey-level zero-gate in `11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md` satisfied; and no fixable internal gap remaining.

Forbidden: opening a new slice before the current one closes; running all slices in parallel; declaring journey completion from a majority of slices; deferring an incomplete slice to a different journey; treating a report/matrix/workflow run as a substitute for slice execution; treating a passing build, a passing backend-only test, or a passing frontend-only test as proof of journey completion.

---

## 41) Multi-journey scope report

After finishing the last authorized journey in a selection range, report:

```yaml
repository:
target_ref:
final_resolved_commit_sha:
authorized_journeys:
completed_journeys:
total_registered_slices:
total_discovered_slices:
total_closed_slices:
total_open_slices: 0
open_internal_gaps: 0
open_external_blockers:
required_independent_reviews:
final_decision:
```

`final_decision` must be one of the canonical values in `governance/contracts/decision-vocabulary.json` (`PASS`, `FIX_REQUIRED`, `BLOCKED_EXTERNAL`, `NEEDS_EVIDENCE`, `READY_FOR_REVIEW`, `PROTOCOL_VIOLATION`, `CLOSED_WITH_EVIDENCE`, or an explicit `OUT_OF_SCOPE_FOR_THIS_JOURNEY` for excluded items). Files `01`, `02`, `07`, `08`, and `09` of this package still use an older, non-canonical result vocabulary (`ANALYSIS_PASS`, `IMPLEMENTATION_PASS`, `DO_NOT_MERGE`, `MERGE_READY`, `BLOCKED_NEEDS_EVIDENCE`). That drift is a known open finding — see `00_INDEX_AND_COVERAGE.md` §"Known vocabulary drift" — and this file (`12`) always defers to the canonical vocabulary, not to the older in-package terms.

Do not create a Pull Request, do not merge, and do not open a scope beyond the authorized selection without a separate, explicit order.
