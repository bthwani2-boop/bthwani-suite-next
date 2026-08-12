# U004 — Partner team and fleet connection

## Objective

Close Partner Store-team and courier fleet connection on one DSH-owned versioned/audited truth, and remove stale canonical fleet evidence metadata without rewriting migration history.

## Current diagnosis

The functional unit boundary remains correct: Partner manages authorized Store team/connection-code lifecycle, Captain is only the redeem/disconnect counterpart, and control-panel reads the redacted operational snapshot. Identity authenticates actors; DSH owns membership truth.

Current `PARTNER_FLEET_CONNECTION` Product Truth requires digest-only one-time connection codes, expiry/revoke/redeem/disconnect, optimistic versions, active-Store eligibility, same-Store duplicate prevention, governed multi-Store membership, audit and notifications.

A concrete current defect exists at the canonical evidence boundary. The Product Truth evidence list still points to `services/dsh/database/migrations/dsh-933_jrn030_partner_fleet_action_audit.sql`, while that path is not the live migration on current `BB`. The actual migration is `services/dsh/database/migrations/dsh-933_partner_fleet_action_audit.sql`, which governs the fleet lifecycle audit action labels/compatibility behavior.

This is not merely cosmetic documentation: Product Truth declares the evidence used for verification. A dead evidence pointer can cause future verification/review automation to resolve the wrong artifact. U004 must repair the Product Truth reference at the authoritative record and verify the migration manifest/database lifecycle. It must **not** rename or destructively rewrite an applied migration just to satisfy stale text.

## Root-cause targets

1. Product Truth current evidence resolves to the actual live migration and no stale `jrn030` path remains.
2. Partner issue/list/revoke is Store-scoped; Captain redeem/list/disconnect is actor-scoped; operator readback is redacted.
3. Plaintext code is returned only where contract permits and never persisted/logged as canonical secret material.
4. Expired/revoked/replayed/stale-version/duplicate/cross-Store/cross-Captain cases fail deterministically.
5. Every required lifecycle action is durable, versioned, audited and notified.
6. Refresh/restart reconstructs membership/code lifecycle from DSH rather than local state.
7. Migration manifest/amendment history remains valid; no checksum/history rewrite is used as a shortcut.

## Boundaries

Primary: app-partner + DSH Partner team/fleet. app-captain and control-panel are mandatory counterparts of this same fleet lifecycle only. Independent Captain operations, Workforce and generic administration are excluded.

## Closure rule

U004 requires Product Truth evidence correction plus Partner fleet backend, contract, PostgreSQL/migration, security and runtime counterpart evidence on the exact candidate. Static route presence or a successful code redemption alone is insufficient.
