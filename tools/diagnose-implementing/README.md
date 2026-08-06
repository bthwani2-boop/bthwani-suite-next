# Diagnose/Implementing — compact complete package

This framework creates a temporary, evidence-backed diagnosis and execution package under `tools/diagnose-implementing/<task-name>/`.

The design is intentionally small: depth comes from repository-backed inventory and strict semantic gates, not from duplicating the same information across many files.

## Package structure

```text
<task-name>/
├─ STATE.json
├─ PACKAGE.md
└─ LEDGER.jsonl
```

- `STATE.json` stores the pinned baseline, lifecycle status, coverage counts, and zero gates.
- `PACKAGE.md` states the human-readable diagnosis and execution contract without duplicating structured records.
- `LEDGER.jsonl` is the single structured source for scope, evidence, flows, findings, risks, work items, verifications, results, blockers, and decisions.

The package is a disposable derived-support artifact. Runtime, builds, CI, migrations, governance, operations, or application code must never depend on it.

## What the generator discovers automatically

`new-package.mjs` seeds factual inventory from the current repository so an agent cannot silently omit visible scope:

1. mandatory surfaces: `control-panel`, `app-client`, `app-partner`, `app-captain`, and `app-field`;
2. every current top-level DSH and WLT control-panel section;
3. every current control-panel route-bearing file such as `page.tsx`, `route.ts`, `layout.tsx`, loading, error, and not-found files;
4. every current control-panel or sovereign frontend source file containing static signals for buttons/clicks, forms/submission, tabs, dialogs/drawers, tables/bulk actions, import/export/upload/download.

Generated scope records start as `UNPROVEN`. They are not findings or invented tasks. Strict validation fails until each record is classified and linked to evidence.

## Creation

From the repository root:

```powershell
node tools/diagnose-implementing/new-package.mjs `
  --name <task-name> `
  --branch <branch> `
  --sha <40-character-sha> `
  --objective "<one measurable objective>"
```

Optional arguments:

```text
--repository owner/repo
--mode DIAGNOSIS_AND_EXECUTION_PLAN
--actor <agent-or-operator>
```

The named SHA must match the exact remote branch baseline used for diagnosis. Re-resolve the branch before writes and after the final push.

## Ledger record types

Use one JSON object per line with a stable unique `id`:

```text
package
authority
scope
evidence
flow
finding
risk
deletion_candidate
work_item
verification
result
blocker
decision
```

Core relationship:

```text
scope/flow claim
→ evidence
→ finding/root cause when defective
→ truth owner and durable correction
→ atomic work item
→ acceptance criteria
→ verification and actual result
→ same-commit decision
```

Do not duplicate complete records in `PACKAGE.md`.

## Coverage rule

Naming one surface, section, tab, feature, page, or journey identifies only the entry point. The diagnosis must expand through every proven owner, writer, reader, consumer, dependency, inbound journey, outbound journey, permission, contract, service, table, event, test, operational effect, security effect, and financial effect.

Every mandatory surface must be classified. Every discovered control-panel section, route file, and interactive source must remain present in the ledger. An item may be marked `NOT_AFFECTED_WITH_EVIDENCE` only with evidence and a reopen trigger.

For an affected interactive page or source, explicitly record the actual tabs, features, actions, reads, writes, permissions, success states, failure states, recovery behavior, and cross-surface effects. A sidebar or top-level-route review never proves completion.

Allowed scope classifications:

```text
AFFECTED
NOT_AFFECTED_WITH_EVIDENCE
OBSOLETE_CANDIDATE
DUPLICATE_CANDIDATE
MIGRATION_REQUIRED
EXTERNAL
UNPROVEN
```

`UNPROVEN` is allowed only while diagnosis is in progress.

## Validation

During diagnosis:

```powershell
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name>
```

Before claiming the package is ready:

```powershell
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name> --strict
```

Before deleting a closed package:

```powershell
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name> --strict --disposal
```

Strict validation checks more than file presence. It:

- re-discovers the current repository-backed control-panel sections, routes, and interactive sources;
- requires all mandatory surfaces and discovered inventory to exist and be classified;
- rejects every nonzero gate, silent exclusion, unresolved marker, duplicate ID, broken reference, or unproven scope;
- requires evidence for classified scope and all material claims;
- requires complete cross-surface flow records for affected scope;
- requires root cause, truth owner, durable correction, and linked atomic work items for findings;
- requires exact changes, affected surfaces/journeys, acceptance, rollback, commit boundary, and verification for work items;
- permits only one `IN_PROGRESS` work item;
- scans for accidental secrets;
- verifies package counts against the actual ledger and repository inventory.

Disposal mode additionally requires durable outputs to be moved to canonical owners and scans for references to the package outside itself.

## Minimum flow record

A `flow` must cover:

```text
actor + intent
entry page/screen/button/event
identity/authorization/scope
contract/client/request
controller/service/use case
persistence/transaction/truth owner
events/jobs/providers/retry/idempotency
state writers and readers
all affected control-panel sections
all affected product surfaces
success/failure/denial/conflict/degradation/not-ready
rollback/recovery/readback/audit/observability
immutable evidence IDs
```

## Minimum finding and work item

A finding must trace symptom → immediate cause → structural cause → incorrect or missing truth owner → affected consumers → durable correction → remnants → verification.

A work item must identify exact paths and symbols, action and target state, forbidden changes, dependencies, affected surfaces and journeys, measurable acceptance, verification IDs, risk, rollback, and one logical commit boundary.

## Safety

Never store secrets, credentials, private keys, production data, personal data, raw database dumps, or sensitive screenshots. Store sanitized references, commands, SHAs, paths, symbols, results, and limitations.

Never delete an item merely because it appears old. Prove references, consumers, replacement readiness, migration order, compatibility, affected checks, rollback, and final removal of all remnants.
