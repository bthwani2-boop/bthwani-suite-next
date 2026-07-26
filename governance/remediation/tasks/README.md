# Task Contracts

Task contract instances live here as JSON (`GAP-<nnnn>.json`), one per gap, validating against `../task-contract.schema.json`:

- `active/` — contracts currently in flight (states `QUEUED` through `RECONCILED`).
- `blocked/` — contracts whose task state is `BLOCKED`, with `blocked_reason` recorded in the ledger.
- `completed/` — contracts whose task reached `CLOSED`; moved here during the cleanup phase.
- `archived/` — superseded or split contracts kept for history (archival over deletion).

Subdirectories are created together with their first instance; no placeholder files.

Execution never starts on a contract that fails schema validation, lacks `scope.allowedPaths`, lacks `acceptance` criteria, or lacks `proof.required`. After the contract freezes (`CONTRACT_READY`), scope expands only through a new contract — never in place.
