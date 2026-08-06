# 00 MASTER EXECUTION PLAN: DSH-WLT Radical Pre-Journey Readiness

## Metadata
```yaml
repository: bthwani2-boop/bthwani-suite-next
branch: smsm
pinned_sha: 9dc7aa8d25a6b89cb3dbda63d1c7d72fe34ba503
target: Full-Stack Multi-Surface DSH & WLT Core
status: DRAFT
```

## Objective
Execute a radical, comprehensive engineering treatment of the entire repository focusing on the `dsh` service and its relationship with `wlt`. Uncover root causes of gaps, violations, inconsistencies, redundancies, parallel sources of truth, wrong dependencies, technical debt, weak architectures, scattered files, and useless files. Implement the most appropriate and sustainable solution according to best engineering, architectural, and security practices.

## Principles
1. **DSH owns operational truth. WLT owns financial truth.** Surfaces access WLT only through authorized DSH facades.
2. **Root Cause First:** Fix the source, not the symptom.
3. **No Patching:** Replace corrupt components instead of chasing chained failures.
4. **Zero Fallbacks:** Eliminate duplicate logic and parallel truths.
5. **Radical Cleanup:** Delete, merge, or move aggressively once usage is analyzed.

## Execution Order
The execution must strictly follow this order. No phase can be closed until its predecessor is `CLOSED_WITH_EVIDENCE`.

| Phase | Description | Status |
|-------|-------------|--------|
| [PHASE-01-AUTHORITY-AND-BOUNDARIES](./PHASE-01-AUTHORITY-AND-BOUNDARIES.md) | Trust, Identity, Permissions, Contracts, Architectural Dependencies | PENDING |
| [PHASE-02-DSH-WLT-SERVICES-AND-INTEGRATIONS](./PHASE-02-DSH-WLT-SERVICES-AND-INTEGRATIONS.md) | Backend Services, Databases, Canonical Owners, Dual Writes Elimination | PENDING |
| [PHASE-03-MULTI-SURFACE-EXPERIENCE](./PHASE-03-MULTI-SURFACE-EXPERIENCE.md) | Frontend, Shared Brains, Routing, UI Controls, Runtime UX | PENDING |
| [PHASE-04-TOOLS-DOCUMENTATION-AND-CLEANUP](./PHASE-04-TOOLS-DOCUMENTATION-AND-CLEANUP.md) | Legacy Elimination, Tools, Workflows, Final Verifications | PENDING |

## Strict Closure Rules
A phase is considered `CLOSED_WITH_EVIDENCE` only when:
- Root causes are removed.
- Obsolete or duplicated paths are eliminated.
- Single source of truth is established.
- Build, Unit, Integration, Contract, Security, Negative, Migration, Rollback, and Runtime smoke tests PASS.
- Explicit proof of what was diagnosed, deleted, moved, merged, and rebuilt is provided.
- Any unresolved item is explicitly listed as a blocker.
