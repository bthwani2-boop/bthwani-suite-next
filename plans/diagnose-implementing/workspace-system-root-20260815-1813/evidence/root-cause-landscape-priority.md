# Target-Wide Root-Cause Landscape and Competitive Priority

Integration truth baseline: `A@8a244d7b2bb5a0193cd8a9ff7476892585175a1b`.

## Live failure basis

Contextual CI run `31890801263` on branch `A` failed on exact SHA `8a244d7b2bb5a0193cd8a9ff7476892585175a1b`. The base→head compare contains only 11 orchestrator/planning commits, so the product/runtime failures exposed by the widened diagnostics are latent baseline debt rather than regressions introduced by those 11 commits.

A second Contextual CI run `31890761624` on another branch succeeded on the exact same SHA with a different branch/base context. This proves branch-context-sensitive affected verification and forbids treating same-SHA green evidence from a narrower context as whole-workspace proof.

## Material findings

### Binding / contract / runtime structure

- **F-001:** DSH OpenAPI declares `GET /dsh/field/finance/payout-destinations/{destinationId}` and `DELETE /dsh/field/finance/payout-destinations/{destinationId}` without matching server registration.
- **F-002:** Five field-onboarding assignment endpoints embed `{assignmentId}` but omit the OpenAPI path-parameter declaration.
- **F-003:** Seven governed DSH surface bindings are missing or cannot reach the registered shared order controller: client checkout, client order tracking, partner orders inbox, captain assignments, captain delivery map, captain pickup/dropoff, and field partner-draft history.
- **F-004:** DSH migrations `dsh-1000` through `dsh-1007` violate the governed migration filename parser/rule.

### Financial presentation sovereignty

- **F-005:** `OrderTrackingScreen.tsx` performs local money formatting and conversion; `CaptainCashInPanel.tsx` performs local formatting. The logic gate requires the canonical WLT money kernel.

### Mobile dependency coherence

- **F-006:** Eight Expo packages differ by one patch between app-client and app-partner/app-captain/app-field: `expo-asset`, `expo-file-system`, `expo-image-manipulator`, `expo-image-picker`, `expo-location`, `expo-notifications`, `expo-sharing`, `expo-updates`.
- **F-007:** Normal Knip reports ten unused runtime dependencies: nine in app-captain and `@tanstack/react-query` in app-field. These require consumer/dependency confirmation before removal.

### Cleanup / stale structure

- **F-008:** Normal Knip proves two unused files at the current candidate: `services/dsh/frontend/app-client/store/StoreDetailInfoCard.tsx` and `tools/orchestrator/sync-machine-summary.mjs`.
- **F-009:** Strict Knip records a much larger cleanup backlog (unused files/exports/types/dependencies/unlisted dependencies/config hints). Strict output is a triage inventory, not automatic deletion authority; each item needs consumer/reference proof.

### Proof / registry provenance

- **F-010:** DSH surface/runtime/service registries remain `FIX_REQUIRED`/historical/null-current-evidence even while multiple static contract and provenance gates pass on the current SHA.
- **F-011:** WLT service manifest remains `FIX_REQUIRED` with current runtime/database/provider proof absent; however current exact code already contains sovereign operator-context-scoped COD, canonical WLT payout destination management, distinct Cash-In top-up semantics, allocation conservation, and blocked legacy payment-session COD collection.
- **F-012:** Identity Product Truth remains `DISCOVERY` while its own record states most implementation exists and the current tree contains trusted-context, activation, refresh-concurrency, readiness, access and security boundaries/tests; required same-commit runtime/visual/independent approval evidence remains incomplete.
- **F-013:** WLT Product Truth narrative contains legacy-current descriptions that are no longer universally true on exact A (for example beneficiary self-service payout destination mutation and unscoped COD runtime assumptions). Governance/Product Truth therefore lags portions of live implementation and must be reconciled from exact-candidate proof, not edited optimistically.
- **F-014:** Full-workspace proof has not run for the final task candidate. The same SHA has both a green contextual run and a failing contextual run under different base/branch scopes. Full verification remains mandatory for this task after fixes.
- **F-015:** Live `A` branch-protection enforcement is inaccessible to the GitHub integration (403) and must remain `NEEDS_EVIDENCE`; this is not treated as a source-code failure.

## Root-Cause Clusters

### RC-001 — Cross-layer DSH integration contract drift

**Root:** backend contract declarations, route registration, surface registry reachability and migration naming have evolved on different edges without a single current candidate closing all static integration guards together.

Operational parents: partner onboarding/publication, checkout/order truth, fulfillment/dispatch/handoff, field onboarding/readiness, cross-surface truthful UX, canonical write/readback and generated-contract invariants.

Blast radius: DSH backend, OpenAPI/generated consumers, app-client, app-partner, app-captain, app-field, database migration validation and any downstream runtime proof that depends on a clean static graph.

Why rank #1: it currently fails three foundational integration guards (`backend-api-binding`, `frontend-feature-binding`, `runtime-real-bindings`), spans contract→backend→surface→database boundaries, and blocks trustworthy execution/runtime verification of multiple top-level journeys. Fixing it unlocks the largest amount of downstream proof.

Competitive deepening: **DEEPENED_ENOUGH_TO_RANK**. Exact failing paths and consumers are known; no unresolved higher upstream technical root was found. The 11 commits that triggered the CI did not modify these product files, proving latent cross-layer debt rather than one recent product regression.

### RC-002 — Financial presentation bypass of WLT money kernel

**Root:** two frontend consumers retain local amount formatting/conversion instead of consuming the WLT shared money kernel, creating a parallel representation path even though WLT financial mutation sovereignty is otherwise substantially converged.

Operational parents: WLT-owned financial truth, customer order readback, captain Cash-In, one-owner/one-readback invariants.

Blast radius: app-client order tracking and captain Cash-In display/readback. It does not own financial mutation, but inconsistent conversion/formatting can make canonical money truth appear differently across surfaces.

Why rank #2: finance is protected/high risk and the violation is deterministic, but its current blast radius is narrower than RC-001 and it has no proven dependency on RC-001.

Competitive deepening: **DEEPENED_ENOUGH_TO_RANK**. Current WLT route/runtime inspection disproved broader assumed financial-sovereignty failures; the remaining proven issue is the local presentation/conversion bypass reported by the logic gate.

### RC-003 — Mobile runtime dependency coherence drift

**Root:** four Expo runtimes no longer share one normalized patch-level dependency set, while app-captain/app-field also retain dependencies with no proven consumers under normal Knip configuration.

Operational parents: cross-surface runtime consistency, mobile application runtime boundaries, truthful build/runtime behavior.

Blast radius: all four mobile runtimes for version drift; app-captain/app-field for unused dependencies; lockfile and native/runtime resolution.

Why rank #3: deterministic guard failure across all mobile apps and potential native/runtime divergence, but independent of business-state authority and narrower than RC-001/financial sovereignty.

Competitive deepening: **DEEPENED_ENOUGH_TO_RANK**. Exact packages and version split are known from candidate CI; dependency removals remain consumer-proof gated.

### RC-004 — Dead/stale/noise inventory not yet reconciled to real consumers

**Root:** repository cleanup has accumulated files/exports/dependency declarations that static reachability no longer sees, while strict Knip intentionally exposes a broader backlog whose false-positive/entry-point risk prevents blind deletion.

Operational parents: canonical consumers, implementation/runtime boundaries, cleanup/maintainability, no-parallel-truth invariant.

Blast radius: DSH frontend, tools/orchestrator, shared UI, control-panel and multiple package manifests according to strict diagnostics.

Why rank #4: normal Knip gives two directly actionable unused files, but most strict backlog requires reference classification and is lower systemic leverage than live integration/finance/mobile blockers.

Competitive deepening: **DEEPENED_ENOUGH_TO_RANK** for priority. Strict backlog cannot outrank the deterministic integration blockers because its entries are not yet all proven removable; deletion remains fail-closed per consumer proof.

### RC-005 — Candidate proof and governance provenance lag live implementation

**Root:** service manifests/Product Truth states and contextual CI evidence are not a single atomic closure snapshot. Implementation can advance while governance records retain historical/`DISCOVERY`/`FIX_REQUIRED` descriptions, and contextual CI can produce different coverage for the same SHA depending on base/branch.

Operational parents: all Product Outcomes, canonical authority/readback, candidate verification and closure flow.

Blast radius: DSH/WLT/Identity closure interpretation, prioritization, CI evidence, protected approvals and final whole-workspace closure.

Dependencies: current deterministic source blockers RC-001..RC-004 must be resolved before registries can be reconciled to a valid final candidate. Full exact-candidate verification and protected approvals remain evidence dependencies.

Why rank #5 now: it is system-wide but updating governance before fixing current failed guards would encode false readiness. Its execution frontier is therefore downstream of source convergence, not the first mutation target.

Competitive deepening: **PROVEN_CANNOT_OUTRANK** the current source blockers for execution order. It remains critical for closure and becomes the frontier after source/cleanup convergence.

## Adversarial priority challenge

Challenges attempted:

1. **Make finance priority #1 because WLT Product Truth is critical/DISCOVERY.** Rejected: exact current WLT routing/code disproves several legacy-current assumptions; only specific frontend money-kernel bypasses are proven now.
2. **Make CI/provenance priority #1 because the same SHA has contradictory runs.** Rejected for execution order: contextual scope difference is policy behavior, and registry updates before source fixes would be false closure. It remains a downstream closure root.
3. **Treat all strict Knip output as priority #1 cleanup.** Rejected: strict inventory includes entry-point/configuration-sensitive items; only normal Knip items are currently proven enough for direct cleanup consideration.
4. **Treat migration filenames as cosmetic.** Rejected: the governed runtime-binding gate fails closed on them, so database verification cannot be considered clean while naming violates the migration parser contract.
5. **Treat missing surface files as registry-only noise.** Rejected until runtime path inspection: they are registered governed `STATIC_BINDING` expectations and currently fail the binding gate; repair may be implementation, registry-path correction or supported removal based on actual app consumers.
6. **Treat the successful same-SHA run on another branch as closure.** Rejected: different base/affected scope; whole-workspace target requires final full candidate evidence.

Result: **PASS**. RC-001 has the highest proven systemic execution leverage. RC-002/RC-003 are independent in files/semantics but are not selected as parallel work in this single-writer remote task; they follow in rank order. RC-005 is intentionally delayed until the candidate is technically truthful.

## Evidence

- GitHub Actions run `31890801263`, job `95026698938`
- GitHub Actions run `31890761624`
- compare `6868fb16898e5bee54a670db49486f34855aef18...8a244d7b2bb5a0193cd8a9ff7476892585175a1b`
- `.github/workflows/ci.yml`
- `governance/contracts/full-verification-policy.json`
- `services/dsh/surface-map.ts`
- `services/dsh/runtime-map.ts`
- `services/dsh/service.manifest.ts`
- `services/wlt/service.manifest.ts`
- `governance/product/contracts/identity-activation-sessions.product-truth.json`
- `governance/product/contracts/wlt-money-movement-settlement.product-truth.json`
- `services/wlt/backend/internal/http/server.go`
- `services/wlt/backend/internal/cod/cod_record_operator_context.go`
- `services/wlt/backend/internal/cod/sovereign_cod.go`
- `services/wlt/backend/internal/payment/topup.go`
- `services/wlt/backend/internal/reference/topup_session.go`
- `services/wlt/backend/internal/reference/payment_session_allocation_db_test.go`
