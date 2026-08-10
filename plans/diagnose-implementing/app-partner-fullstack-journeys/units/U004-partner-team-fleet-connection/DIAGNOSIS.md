# Diagnosis — U004 partner-team-fleet-connection

## Inclusion reason

Partner Store team management and Partner-owned courier fleet connection are directly connected: Partner issues/manages team access and one-time courier connection lifecycle, Captain redeems or disconnects, and an authorized operator reads redacted state. `PARTNER_FLEET_CONNECTION.product-truth.json` names these surfaces and assigns fleet membership truth to DSH. Generic Captain workforce and unrelated administration remain outside this unit.

## Current behavior and observable defect

The Partner route registry includes `team` and `store-courier`, and the Partner guard requires real mutation results, audit-log readback and database invariants around pending invites/advisory locking/no-op status/audit. Those checks do not prove fleet one-time-code secrecy, simultaneous redemption/revocation, Store isolation, member-role consistency or Captain/operator readback. The defect class is divergence between Store-team membership and fleet connection state, or a code/token path that grants membership without canonical DSH transaction/audit.

## Root cause and target architecture

Identity authenticates actors, but DSH owns Partner Store-team and fleet membership. Connection codes are credentials/intents, not durable membership truth. Partner issue/revoke, Captain redeem/disconnect and operator redacted readback must converge on one versioned/idempotent DSH lifecycle with server-side Store/actor scope, hashed/non-recoverable token treatment and auditable state transitions.

## Exact affected paths and symbols

Partner team/fleet frontend, shared Partner fleet API, Captain connection screen, control-panel Partner/operator slice, DSH `partnerfleet` backend, DSH database/migrations/contracts. Key symbols: `PartnerTeamManagementScreen`, `usePartnerFleetController`, `issueDshPartnerCourierConnectionCode`, `connectDshCaptainToPartnerFleet`, `getDshOperatorPartnerFleetSnapshot`.

## Risks and evidence

Do not persist plaintext codes, create local fleet arrays, expose cross-Store membership, or broaden Captain workforce. Concurrency, stale version, expired/revoked/replayed codes, audit and redaction require proof. Evidence: `EV-005`, `EV-013`, `EV-020`.
