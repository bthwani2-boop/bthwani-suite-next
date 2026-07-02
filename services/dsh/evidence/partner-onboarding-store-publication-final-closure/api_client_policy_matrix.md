# api_client_policy_matrix

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

```yaml
api_client_policy_matrix:
  contract_path: services/dsh/contracts/dsh.openapi.yaml
  client_generation_enabled: true (types only)
  generated_client_path: services/dsh/clients/generated/dsh-api.ts (openapi-typescript type definitions — no runnable request facade)
  shared_client_path: services/dsh/frontend/shared/partner/partner.api.ts
  manual_fetch_used: true
  manual_fetch_justification: >
    Option B adopted. The generated artifact exposes OpenAPI types only; no generated
    request facade exists for partner operations. partner.api.ts is an isolated shared
    transport adapter: every exported function is bound to exactly one operationId
    (see operation_binding_matrix.md), contains no business logic, and lives in the DSH
    shared brain. Screens never fetch directly.
  contract_type_alignment: PASS  # binding table corrected in this closure to match real operationIds/routes in dsh.openapi.yaml (previous table listed non-existent operationIds — fixed)
  error_mapping_alignment: PASS  # adapter throws {kind:'http', status} consumed by shared controllers/state contracts
  guard_proof: pnpm run guard:no-direct-fetch-in-screen → PASS (see verification-output.md)
  verification_command: |
    rg -n "fetch\(|axios" services/dsh/frontend/app-client services/dsh/frontend/app-partner services/dsh/frontend/app-field services/dsh/frontend/control-panel   # no hits
    pnpm run guard:no-direct-fetch-in-screen
```
