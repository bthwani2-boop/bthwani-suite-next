# Diagnosis — U006 partner-support-order-rescue

## Inclusion reason

Partner support is a direct Partner capability and can be attached to an owned Store/order. The same DSH support/incident contracts are consumed by Client, Captain and operator surfaces, while operator alone owns rescue transitions. Those cross-surface slices are included only to preserve shared contract/state isolation; unrelated support cases are outside the unit.

## Current behavior and observable defect

The Partner guard rejects static order cases, local lifecycle arrays and fake support navigation and requires real support controller mutations. This reduces placeholder risk but cannot prove ticket ownership, participant/message authorization, internal-note redaction, incident transition legality, rescue ordering, persistence/audit or cross-actor readback. A Partner UI can appear correct while another actor's ticket/order leaks through guessed IDs or while operator rescue mutates a separate local state.

## Root cause and target architecture

DSH support/incident/order-rescue is authoritative. Partner may create/read/send only within owned Partner/Store/order scope. Client/Captain receive only their authorized views. Operator may perform incident/rescue transitions according to Product Truth. Internal notes and restricted actor data must be redacted. WLT is visibility-only where explicitly allowed and cannot be mutated by DSH rescue shortcuts.

## Exact affected paths and symbols

Affected paths include Partner support screen/controller, shared support contracts, control-panel Support/Operations, DSH support/backend/database/contracts and required Client/Captain compatibility. Key symbols include `usePartnerSupportController`, ticket creation/message operations, governed incidents and order-rescue update handlers.

## Risks and evidence

Test guessed ticket/order IDs, wrong Store/actor, internal-note leakage, duplicate message/ticket creation, stale incident transition, operator rescue retry and refresh/restart. Do not grant Partner rescue authority or WLT mutation. Evidence: `EV-005`, `EV-013`, `EV-021`.
