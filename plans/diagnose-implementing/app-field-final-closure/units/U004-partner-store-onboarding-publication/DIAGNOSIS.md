# U004 — partner-store-onboarding-publication

## Boundary
This unit follows the current `PARTNER_ONBOARDING_STORE_PUBLICATION` Product Truth. The field agent creates and maintains an assigned partner/first-store onboarding draft and evidence; control operators review and decide; app-partner reads its own governed state; app-client participates only at the final public store outcome. app-captain is explicitly excluded.

## Current diagnosis
The authoritative product contract says the field actor may create/edit assigned drafts, capture first-store profile, upload documents, submit evidence-bearing field visits and submit for review, but may not approve its own evidence, publish directly, reassign another partner's store or write financial truth. Current app-field onboarding already contains camera/gallery/document picking, media upload/linking, partner draft creation/resume and catalog entry points. This is substantial implementation, but closure requires proving durability and ownership rather than merely seeing screens.

The current head also contains a correct DSH store-mutation hardening that did not exist at the original diagnosis pin: canonical request fingerprinting includes operator context, actor, store, operation and payload, and PostgreSQL advisory locking serializes an idempotency identity in the transaction. U004 must preserve and prove reuse of this mechanism for applicable field store mutations; it must not build another surface-local idempotency source.

The critical cross-surface seam is review/publication. The same partner/store identity must persist from field draft through evidence review and allowed operator transitions. Partner app readback must show the committed activation/readiness state, and the client must not discover the store until every applicable partner/store/catalog/serviceability publication gate passes. WLT owns raw payout destination data; DSH may retain only approved WLT references or masked compatibility values. Version conflict, assignment scope and immutable audit remain required negative-path concerns even where canonical store idempotency is already implemented.

## Remaining changes
- Trace create/resume/save/conflict/document/media/location/agreement/submission through canonical shared controller, API contract, DSH persistence and audit.
- Verify applicable field store mutations use the canonical DSH idempotency fingerprint/advisory-lock path and extend focused coverage only where gaps remain.
- Prove assignment scoping and reject cross-partner/store identifiers without information leakage.
- Verify separation of field evidence capture from operator review/approval and prevent generic store relinking from changing ownership.
- Verify WLT payout-reference prerequisite without raw payout identifiers in DSH.
- Prove app-partner readback and app-client visibility only after all current publication gates.

## Exit condition
One real partner and first store must survive refresh/restart and move from field draft to a governed operator decision, partner readback and, when all gates pass, client visibility. No self-approval, cross-scope mutation, duplicate retry effect, raw financial data or false client publication is allowed. Existing canonical DSH idempotency must be exercised rather than reimplemented.
