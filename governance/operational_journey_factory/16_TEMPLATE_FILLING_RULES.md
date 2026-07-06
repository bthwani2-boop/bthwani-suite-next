# Template Filling Rules

- Do not fill templates by impression.
- Every field must come from source, tool output, command output, or justified exclusion.
- `UNKNOWN` is allowed only before execution and blocks journey start.
- Every `UNKNOWN` must become a required action.
- Every required action must be one of: `bind`, `move`, `merge`, `split`, `delete_after_proof`, `clean`, `implement`, `test`, `document_external_blocker`, or `keep_with_proof`.
- Every deletion requires proof of no binding from at least these sources: imports, exports, routes, navigation, runtime-map, service.manifest, capability-map, generated clients, tests, and CI/guards.
- Every move requires proof that imports and runtime references remain valid.
- Every merge requires duplication proof.
- Every bind requires route, shared, backend, API, generated client, and verification proof.
- Every feature requires an owner.
- Every icon and action requires a handler, disabled reason, or read-only proof.
- Every surface requires state coverage.
- Every control-panel tab and section in scope requires ownership and binding proof.
- Every frontend/backend binding requires evidence across UI, shared controller or view-model, generated client or adapter, OpenAPI, backend route, handler, service, and database/config truth when applicable.
- Every platform provider, var, integration, feature flag, policy, SLA, zone, and capacity rule is owned by `control-panel/platform`; app surfaces are consumers only.
- WLT owns financial truth; DSH and Control Panel Platform must not mutate ledger, settlement, payout, or refund truth.
