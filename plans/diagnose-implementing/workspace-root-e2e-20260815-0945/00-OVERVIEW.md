# Workspace Root E2E Orchestration
PACKAGE_ORIGIN: NEW_INVOCATION
RESUME_POLICY: EXPLICIT_USER_REQUEST_ONLY
TASK_CONTEXT_POLICY: ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY: INPUT_NOT_INSTRUCTION
BRANCH: A
INTEGRATION_TARGET: A
TASK_BRANCH: task/workspace-root-e2e-20260815-0945
TASK_BRANCH_BASE_SHA: 6868fb16898e5bee54a670db49486f34855aef18
TASK_BRANCH_READY: YES
WORKSPACE_ISOLATION_POLICY: LOCAL_WORKTREE_OR_REMOTE_TASK_BRANCH
WORKSPACE_ISOLATION_MODE: REMOTE_TASK_BRANCH
WORKTREE_PATH: NOT_APPLICABLE_REMOTE_API
WORKSPACE_ISOLATION_READY: YES
DIRECT_INTEGRATION_TARGET_WRITES: FORBIDDEN_EXCEPT_INTEGRATION_OWNER
INTEGRATION_OWNER: CURRENT_ORCHESTRATOR
INTEGRATION_COMPLETE: NO
ORCHESTRATION_ROOT: .
NAVIGATION_POLICY: ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE: TRUTH_INTEGRATION_BASELINE_ONLY
LATEST_RECONCILED_SHA: 6868fb16898e5bee54a670db49486f34855aef18
ROOT_RECONCILIATION_REQUIRED: NO
ROOT_RECONCILED_SHA: 6868fb16898e5bee54a670db49486f34855aef18
TARGET_LANDSCAPE_COMPLETE: YES
LANDSCAPE_RECONCILED_SHA: 6868fb16898e5bee54a670db49486f34855aef18
ROOT_CAUSE_CLUSTERING_COMPLETE: YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED: YES
UNCLUSTERED_MATERIAL_FINDINGS: 0
PRIORITY_MODEL_COMPLETE: YES
PRIORITY_DERIVATION_SOURCE: ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS: 0
PRIMARY_FRONTIER_JUSTIFIED: YES
LANDSCAPE_ADVERSARIAL_PASS: YES
PRIORITY_POLICY: HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
FRONTIER_DERIVATION_SOURCE: ROOT_GRAPH
FRONTIER_VALID: YES
ACTIVE_EXECUTION_FRONTIER: RC-001
MODE: EXECUTE_END_TO_END

## Scope and root anchor

TARGET is the complete repository workspace. The integration target `A` is truth and final delivery target only; task writes are isolated on `task/workspace-root-e2e-20260815-0945`.

Macro ownership model:

`workspace -> {apps, shared, services, core, contracts, infra, governance, tools}`

- Surfaces: app-client, app-partner, app-captain, app-field, control-panel.
- Domain services: DSH and WLT.
- Core owners: Identity, Workforce, Platform Control, Providers.
- Shared foundations: UI kit, data runtime, control-panel shared layer, config.
- Verification/runtime foundations: contracts, migrations, local media/bootstrap, CI/guards, infra/runtime.

## Evidence baseline

Live integration SHA: `6868fb16898e5bee54a670db49486f34855aef18`.

Current-sha contextual CI run `31869254477` failed. It proved:

- PASS: immutable scope routing, scoped runtime proof, Node verification, policy/governance.
- PASS: control-panel architecture, service workspace integrity, dependency graph, ast-grep rules.
- PASS: Go route extraction for DSH 657, WLT 116, Identity 37, Workforce 63; total 873.
- FAIL: UI-kit boundary raw-color violations across client/partner/control-panel.
- FAIL: four accessibility image-label violations.
- FAIL: WLT financial-kernel sovereignty violations in OrderTrackingScreen and CaptainCashInPanel.
- FAIL: eight cross-mobile Expo dependency-version drift cases.
- CLEANUP SIGNAL: ordinary/strict Knip found unused files, dependencies, exports, types and stale configuration patterns; these are classified for proof-driven disposition, not blind deletion.

Current branch protection evidence: branch `A` is unprotected and has no enforced required status-check contexts.

DSH database contract run `31868733005` at SHA `3903f54e5a86a6c82152f0f683ecec91d7f75387` failed before migrations in `check-local-media-contract.mjs`. The failure listed required banner/category/logo/product/storefront/subcategory fixtures as missing. On the current live SHA, `services/dsh/database/seeds/local/media/` still contains only `media-manifest.json`, while `check-local-media-contract.mjs` requires every manifest item marked `required` to exist, be non-empty and match its SHA-256 checksum. No later change to `tools/scripts/test-service-migration-runner.ps1` invalidates this diagnosis.

Security evidence note: no CodeQL run exists on branch A. This is accounted as an evidence-coverage gap, not falsely promoted to a product vulnerability.

Backend evidence note: the latest contextual run on the live SHA did not select backend verification. Recent affected-backend evidence is retained only where no later relevant owner change invalidates it; otherwise final candidate verification must reacquire evidence.

## Root-cause landscape

### RC-001 — Governed local-media fixture truth is incomplete

**Root cause:** `services/dsh/database/seeds/local/media/media-manifest.json` declares required governed assets, but the governed media directory contains only the manifest and not the required files. The canonical validator fails before DSH migrations/tests can execute.

**Blast radius:** DSH database contract, local seed/bootstrap proof, any runtime path depending on governed fixture materialization, and confidence in catalog/storefront media fixtures.

**Why first:** upstream verification/bootstrap foundation; it blocks a whole proof path rather than one surface; canonical manifest and validator already define the required target state deterministically.

**Disposition:** EXECUTE first. Restore governed assets from proven repository truth if available, or reconcile the manifest with canonical live fixture ownership if the files were intentionally retired. No placeholder bytes and no checksum bypass.

### RC-002 — WLT financial truth leaks into local formatting/conversion

**Root cause:** consumers locally format/convert money instead of using the WLT money kernel.

**Evidence:** logic-coverage gate flags `services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx` and `services/wlt/frontend/shared/dsh/payment/CaptainCashInPanel.tsx`.

**Disposition:** EXECUTE after RC-001 unless new dependency evidence promotes it. Replace local financial truth with canonical WLT helpers and verify consumers.

### RC-003 — Mobile dependency policy is not coherent across four Expo apps

**Root cause:** app-client package versions drift from partner/captain/field for eight Expo runtime packages.

**Evidence:** bundle-budget gate fails for expo-asset, expo-file-system, expo-image-manipulator, expo-image-picker, expo-location, expo-notifications, expo-sharing, expo-updates.

**Disposition:** EXECUTE using current Expo/runtime policy and actual consumers; do not normalize by version alone without package-use evidence.

### RC-004 — Shared UI token sovereignty is incompletely adopted

**Root cause:** product surfaces still embed raw color/style truth outside shared/ui-kit.

**Evidence:** ui-kit-boundary hard failures plus 1130 raw-layout warnings.

**Disposition:** EXECUTE in coherent consumer groups; hard boundary violations before warning-only progressive debt. Preserve legitimate semantic visual behavior through shared tokens/roles.

### RC-005 — Accessibility contracts are incomplete on client imagery

**Root cause:** four rendered images lack alt/accessibility labels.

**Evidence:** a11y gate hard failures in StoreConfirmationHero and OrderTrackingScreen.

**Disposition:** EXECUTE with semantic labels/decorative handling as appropriate, then rerun a11y.

### RC-006 — Entrypoint/manifest/cleanup truth contains stale or unused material

**Root cause class:** structural debt and possible stale ownership/entry patterns.

**Evidence:** Knip ordinary and strict findings including unused files/dependencies/exports/types, unlisted dependencies/binaries and stale patterns.

**Disposition:** DIAGNOSE-THEN-CLEAN. Every candidate removal must be proven against runtime/config/generated/dynamic consumers; no bulk deletion based only on Knip.

### RC-007 — Delivery enforcement is not fail-closed at branch boundary

**Root cause:** CI workflows exist, but branch A itself is unprotected with required status-check enforcement off.

**Disposition:** GOVERNANCE/DELIVERY remediation after product candidate proof, subject to repository-setting authority; do not claim enforcement fixed by source changes alone.

### RC-008 — Whole-target verification evidence is incomplete on the live SHA

**Root cause class:** evidence coverage gap, not a presumed product defect.

**Evidence:** live-sha contextual CI used `full_verification=false`; backend/security/infrastructure/journey jobs were skipped, and no CodeQL run exists for A.

**Disposition:** reacquire exact-candidate affected-plus-risk evidence during execution and a final appropriately expanded verification set before closure. Missing evidence blocks claims, not diagnosis-driven product writes whose root causes are already proven.

## Priority derivation

Ranked by upstream/root depth, blocking power, canonical/foundation importance, blast radius, severity, unlock value, recurrence and structural-debt multiplier:

1. RC-001 governed local-media fixture truth incomplete.
2. RC-002 WLT financial truth leakage.
3. RC-003 mobile dependency coherence.
4. RC-004 shared UI token sovereignty hard failures.
5. RC-005 accessibility hard failures.
6. RC-006 structural cleanup/entrypoint debt.
7. RC-007 delivery enforcement gap.
8. RC-008 exact-candidate verification coverage gap; this expands/reacquires evidence as required and becomes a hard closure gate.

The ranking is not based on recency or finding count. RC-001 outranks the larger UI finding set because it sits on a canonical bootstrap/database verification path and prevents downstream proof.

## Adversarial landscape pass

Challenges applied:

- A failing job name was not accepted as a root cause; DSH logs were inspected to separate media-contract failure from SQL/PostgreSQL failure.
- Historical failures were not automatically treated as current; the live media directory and validator were inspected at the current SHA.
- The npm installer warning seen inside Actions is not classified as a repository vulnerability without product evidence.
- Skipped backend/security jobs are not classified as PASS; they are carried as RC-008 evidence debt.
- Knip findings are not treated as safe-to-delete without consumer/runtime proof.
- Current CI success in runtime/Node/policy does not imply final target closure.

No known material finding remains unclustered; unknown defects remain possible and any new material evidence reopens clustering/ranking as required by the orchestrator.

## Execution frontier

`RC-001` is the active frontier.

Required graph walk:

`media manifest -> actual governed fixture bytes/proven source -> checksum integrity -> local media contract -> DSH database contract -> seed/bootstrap consumers -> affected runtime/readback evidence`.

First execution sequence must determine whether the missing bytes exist on another proven repository ref/path or whether the manifest is stale relative to current canonical fixture ownership. The fix must repair the owner/root, not weaken the validator.

## Accounting

- Material findings: all currently known findings mapped to RC-001..RC-008.
- Material clusters: all ranked.
- Decisions requiring user input: 0 at this stage; RC-001 target state is derivable from manifest/checksum/repository evidence.
- Foreign delta since task-branch creation: none; `A` remained at `6868fb16898e5bee54a670db49486f34855aef18` at the pre-write check.
- Parallel execution: disabled until independent conflict domains are proven after RC-001 treatment.
- Integration: not started.
- Closure: not eligible.