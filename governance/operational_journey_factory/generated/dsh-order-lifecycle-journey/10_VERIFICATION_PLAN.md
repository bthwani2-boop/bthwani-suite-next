# Verification Plan

status: `DISCOVERY_PACKAGE_ONLY`

## Checks For This Package Creation

- `pnpm run guard:operational-journey-factory`
- `git --no-pager diff --check`
- targeted search to confirm this generated journey package contains no hardcoded branch-name tokens
- `git status --short --untracked-files=all`

## Future Implementation Checks

- `pnpm run guard:frontend-feature-binding`
- `pnpm run guard:backend-api-binding`
- `pnpm run guard:go-routes-ci`
- `pnpm run guard:wlt-financial-boundary`
- relevant package or workspace typecheck for touched files
- runtime smoke only when runtime behavior is changed or live-readiness is claimed

## Acceptance Criteria For Package Creation

- All journey package files exist.
- Package contains no branch names.
- Package contains no raw diagnostics.
- Package records blockers instead of guessing.
- Factory guard passes.
- Diff check passes.

## Acceptance Criteria For Future Implementation

- Every affected surface has explicit binding proof.
- Every UI action/icon/state has handler or justified disabled/read-only reason.
- Every OpenAPI operation has backend and generated client evidence.
- Every database/audit/permission/runtime/CI gap is resolved or blocked with proof.
- No final readiness claim is made without runtime and evidence checks.
