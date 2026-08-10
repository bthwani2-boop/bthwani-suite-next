# Diagnosis — U002 partner-order-intake-preparation

## Inclusion reason

Orders are a primary Partner responsibility and are immediately consumed by customer and operator surfaces. The Partner workboard reads actor-scoped DSH orders, while accept/reject/preparation/issues are mutations whose final truth must live in DSH and persist to PostgreSQL. This unit ends before Store-to-Captain custody, which is intentionally separated into U005.

## Current behavior and observable defect

`usePartnerOrdersRuntime` is server-backed and the Partner guard forbids local optimistic final order truth. `DshPartnerOrderJourneyRenderer` routes rejection, issues, handoff and delivering states through shared operational screens. Those are strong structural controls, but they do not prove every Partner command uses the same legal order state machine, ownership check, idempotency identity and read-after-write path. A Partner-only UI pass can therefore hide a backend transition or client/operator readback mismatch.

## Root cause and target architecture

DSH Order is the sole operational owner. Partner intent must pass through shared order commands/contracts, server-side Partner/Store/order authorization, transactional state transitions and canonical readback. WLT may receive governed financial consequences separately but cannot become order operational truth.

## Exact affected paths and symbols

`services/dsh/frontend/app-partner/orders`, `services/dsh/frontend/shared/orders`, `DshPartnerOrderJourneyRenderer.tsx`, control-panel Operations, DSH backend/order domain/database/contracts. Key symbols: `usePartnerOrdersRuntime`, `usePartnerOrderCommands`, `fetchPartnerOrders`, `OperationalOrdersInboxScreen`, `OperationalOrderDecisionScreen`.

## Risks and evidence

Do not add local final state, role-only authorization or a second order state machine. Verify duplicate/retry, stale version, wrong-Store order IDs, refresh/restart, client/operator readback and failure recovery. Evidence: `EV-003`, `EV-013`, `EV-017`, `EV-018`.
