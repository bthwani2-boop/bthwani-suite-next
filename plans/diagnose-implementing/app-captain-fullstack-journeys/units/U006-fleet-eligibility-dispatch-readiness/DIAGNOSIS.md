# U006 — fleet-eligibility-dispatch-readiness

Dispatch eligibility is a conjunction, not a single flag. Current DSH governance checks Captain accreditation, persisted availability, WLT financial eligibility and expiry, eligibility timestamp, dispatch profile freshness, provider absence, service-area context and remaining capacity. Assignment validation also needs transactional row locking/recomputation so two concurrent orders cannot both consume the same final capacity.

Partner fleet is a separate DSH lifecycle that directly affects Captain work. One-time connection credentials must be secret-by-design, stored as digests rather than reusable plaintext, scoped to the correct partner/Captain, versioned, expiring/revocable and auditable. Captain redeem/list/disconnect, partner readback and operator readback must converge without exposing another Captain or a reusable secret.

Financial eligibility remains WLT-owned. DSH may store/consume the bounded projection needed for dispatch but must not reproduce balance or finance arithmetic. Missing, stale, malformed or unavailable financial eligibility fails closed. This unit proves every predicate independently and as a transactionally coherent candidate decision, without pulling unrelated partner management or WLT finance operations into scope.

## Closure boundary

DSH owns dispatch candidate selection and partner-fleet relationship; WLT owns financial eligibility values consumed as an opaque projection. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.
