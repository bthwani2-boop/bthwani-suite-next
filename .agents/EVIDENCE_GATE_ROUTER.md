# Evidence Gate Router

Choose the smallest check that can prove the requested claim.

## Default

For `CODE_BASED_LEAN` work:

- inspect the directly relevant implementation;
- apply the smallest safe diff;
- run one targeted check when a check is useful and available;
- report changed paths, result, and remaining risk.

LeanCTX, Graphify, Nx graphs, full workspace checks, runtime environments, screenshots, evidence packs, and command logs are not default requirements.

## Evidence levels

### LOW

Text or documentation with no behavioral claim. Use direct review and a diff check.

### FOCUSED

One bounded module. Use its nearest type, lint, test, build, or registered guard check.

### STANDARD

Multiple files or layers with clear ownership. Use affected checks only.

### UI

Verify affected code and bindings. Add screenshots or recordings only for an explicit visual request, visual parity, release evidence, or final visual closure.

### API

Verify only affected contracts, backend routes, generated clients, and consumers.

### RUNTIME

Run targeted startup or smoke proof only when runtime behavior changed or is claimed.

### HIGH

For public boundaries, security, finance, migrations, move/delete operations, CI, governance, release, or production, add the specialist evidence required by that risk. Do not replace targeted checks with an automatic repository-wide suite.

## Decisions

Map the result through `governance/contracts/decision-vocabulary.json`.

Use:

- `PASS` for the exact scope proven;
- `FIX_REQUIRED` when an in-scope check fails;
- `NEEDS_EVIDENCE` when the requested claim lacks current proof;
- `BLOCKED_EXTERNAL` only for a real external dependency;
- `READY_FOR_REVIEW` when implementation is complete but protected approval remains;
- `PROTOCOL_VIOLATION` for authority, safety, scope, or evidence breaches.

A static pass never upgrades runtime, visual, security, finance, isolation, release, production, or final closure evidence.
