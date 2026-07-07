# 04 Cross-Journey Gap Ledger

status: `RESOLVED_OR_CLASSIFIED`

This ledger lists all cross-journey gaps and warnings discovered during toolchain execution, their classifications, ownership, and statuses.

---

### GAP 1: Workflow Security API 401 Unauthorized

- **id**: `workflow-security-api-401`
- **source**: `guard:workflow-security`
- **affected files**: [ci-pr-fast.yml](file:///.github/workflows/ci-pr-fast.yml)
- **owner**: `toolchain`
- **root cause**: `restricted_sandbox_blocks_github_api_access`
- **risk level**: `P1`
- **required action**: `classify_as_blocked_needs_env_or_mock_network`
- **allowed decision**: `BLOCKED_NEEDS_ENV`
- **forbidden actions**: `ignore_security_gate_without_evidence`
- **tool evidence**: `HTTP 401 Unauthorized for URL github.com when listing branches for actions/checkout`
- **verification command**: `pnpm run guard:workflow-security`
- **closure condition**: `Workflow run in environment with authorized Github API token access`
- **current status**: `BLOCKED_NEEDS_ENV`

---

### GAP 2: DSH Partner Workflow Circular Dependency Warning

- **id**: `dsh-partner-workflow-circular-warning`
- **source**: `guard:dependency-graph`
- **affected files**: [partner.workflow.ts](file:///services/dsh/frontend/shared/partner/partner.workflow.ts)
- **owner**: `dsh_frontend_shared_brain`
- **root cause**: `tightly_coupled_shared_partner_apis`
- **risk level**: `P2`
- **required action**: `accept_warning_with_proof_or_schedule_yagni_split`
- **allowed decision**: `FALSE_POSITIVE_WITH_PROOF`
- **forbidden actions**: `split_without_verifying_existing_imports`
- **tool evidence**: `CIRCULAR in DSH frontend: shared/partner/partner.workflow.ts -> shared/partner/catalog-approval.api.ts -> shared/partner/partner.workflow.ts`
- **verification command**: `pnpm run guard:dependency-graph`
- **closure condition**: `Imports verify clean and do not crash screen-flow runtime`
- **current status**: `FALSE_POSITIVE_WITH_PROOF`

---

### GAP 3: DSH Delivery Circular Dependency Warning

- **id**: `dsh-delivery-circular-warning`
- **source**: `guard:dependency-graph`
- **affected files**: [captain-surface.binding.ts](file:///services/dsh/frontend/shared/delivery/captain-surface.binding.ts)
- **owner**: `dsh_frontend_shared_brain`
- **root cause**: `chat_and_delivery_index_import_cycles`
- **risk level**: `P2`
- **required action**: `accept_warning_with_proof_or_schedule_yagni_split`
- **allowed decision**: `FALSE_POSITIVE_WITH_PROOF`
- **forbidden actions**: `split_without_verifying_existing_imports`
- **tool evidence**: `CIRCULAR in DSH frontend: shared/delivery/index.ts -> shared/delivery/captain-surface.binding.ts -> shared/chat/index.ts -> shared/chat/chat.model.ts`
- **verification command**: `pnpm run guard:dependency-graph`
- **closure condition**: `Imports verify clean and do not crash screen-flow runtime`
- **current status**: `FALSE_POSITIVE_WITH_PROOF`
