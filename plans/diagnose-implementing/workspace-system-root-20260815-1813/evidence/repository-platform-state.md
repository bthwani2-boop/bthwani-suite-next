# Repository-Platform Evidence State

Truth/integration baseline: `A@8a244d7b2bb5a0193cd8a9ff7476892585175a1b`.

## Corrected GitHub exact-SHA evidence

The initial `fetch_commit_workflow_runs` query returned no runs because that connector action is limited to pull-request-triggered runs. It is **not** valid evidence that no Actions run exists for the SHA. A direct GitHub Actions API query by `head_sha` corrected that interpretation.

Two Contextual CI runs exist for the exact same SHA:

1. Run `31890801263`, branch `A`, event `push`, conclusion `failure`. The contextual base was `6868fb16898e5bee54a670db49486f34855aef18`; the changed range was 11 orchestrator/planning commits. The run selected contract/node diagnostics and exposed pre-existing workspace debt.
2. Run `31890761624`, branch `task/orch/operational-first-v3-20260815`, event `push`, conclusion `success`. It used the same immutable head SHA but a different branch/base context, so it did not exercise the same affected scope.

The failing `A` run proves the following exact-candidate blockers:

- `backend-api-binding-gate`: 2 DSH payout-destination contract routes missing backend registration and 5 field-onboarding paths missing their `assignmentId` OpenAPI path parameter.
- `frontend-feature-binding-gate`: 7 required DSH surface bindings are missing or cannot reach their registered shared order controller.
- `runtime-real-bindings-gate`: migrations `dsh-1000` through `dsh-1007` violate the governed migration filename rule.
- `logic-coverage-gate`: 3 finance-local formatting/conversion violations bypass the WLT money kernel.
- `bundle-budget-gate`: 8 Expo package versions drift between app-client and the other mobile runtimes.
- normal Knip diagnostics: 2 unused files and 10 unused runtime dependencies.
- strict Knip backlog records a broader candidate cleanup inventory that must be triaged rather than blindly deleted.

Other material exact-candidate evidence from the same failing run:

- policy/governance verification passed;
- contract registry drift passed;
- migration manifest drift passed;
- generated-client provenance passed;
- contract scope binding passed;
- deterministic OpenAPI composition/validation passed for Identity, Workforce, Platform-Control, Providers, DSH and WLT;
- every registered DSH route declaration/permission reachability checks passed;
- service workspace validation passed;
- Node deep verification passed;
- runtime proof and backend verification were skipped by the affected router for this push and therefore remain unproven for whole-workspace closure.

Live branch-protection query for `A` returned HTTP 403 / `Resource not accessible by integration`; current protection enforcement is `NEEDS_EVIDENCE` through this integration.

## Branch-context interpretation

`ci.yml` is deliberately contextual: it runs on pushes to any branch but selects affected scopes from base→head; full verification is available through explicit `workflow_dispatch mode=full`, a change to the canonical full-verification policy, or evidence-driven impact expansion. Therefore a green run for the same SHA on another branch is not equivalent to whole-workspace closure.

For this task, full-workspace mode requires a final exact-candidate full verification after all material fixes. The available GitHub connector exposes rerun actions but not workflow-dispatch creation, so explicit full dispatch may remain an external evidence step unless the final change impact legitimately expands the router to full verification.

## Provenance

- GitHub Actions run `31890801263` and failed job `95026698938`
- GitHub Actions run `31890761624`
- `.github/workflows/ci.yml`
- `governance/contracts/full-verification-policy.json`
- `governance/github/workflow-registry.json`
