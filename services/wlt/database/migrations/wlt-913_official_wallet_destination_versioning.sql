-- WLT-913: OfficialWalletDestination provider identity, versioning and verification.
--
-- WLT-118 folded the legacy bank/IBAN/mobile-money columns into a single
-- destination_method plus an encrypted reference, but it kept the legacy
-- values as the method itself. Product Truth requires payout destinations to
-- be verified official-wallet accounts, and treats a manual bank transfer as
-- an execution method rather than as a destination type.
--
-- This migration adds the official-wallet provider identity, the destination
-- version chain and the re-verification lifecycle. It preserves every legacy
-- row: destination_method stays as read-only history, and no row is deleted.

BEGIN;

-- Supported official-wallet providers are a governed, operator-context-scoped
-- policy. An empty registry means no destination can be verified, which is the
-- correct fail-closed state for a context that has not declared its providers.
CREATE TABLE IF NOT EXISTS wlt_official_wallet_providers (
  operator_context_id text        NOT NULL,
  provider_key        text        NOT NULL,
  display_name        text        NOT NULL,
  active              boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, provider_key),
  CONSTRAINT wlt_official_wallet_providers_key_chk
    CHECK (provider_key <> '' AND provider_key = lower(provider_key))
);

ALTER TABLE wlt_payout_destinations
  ADD COLUMN IF NOT EXISTS official_wallet_provider_key text,
  ADD COLUMN IF NOT EXISTS destination_version          integer,
  ADD COLUMN IF NOT EXISTS material_identity_hash       text,
  ADD COLUMN IF NOT EXISTS superseded_at                timestamptz;

-- Version the existing chain per governed owner scope, oldest row first, so
-- historical destinations keep a stable and auditable ordinal.
WITH ordered AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY operator_context_id, owner_actor_type, owner_actor_id
           ORDER BY created_at, id
         ) AS ordinal
  FROM wlt_payout_destinations
)
UPDATE wlt_payout_destinations AS d
SET destination_version = ordered.ordinal
FROM ordered
WHERE d.id = ordered.id
  AND d.destination_version IS NULL;

UPDATE wlt_payout_destinations
SET material_identity_hash = ''
WHERE material_identity_hash IS NULL;

ALTER TABLE wlt_payout_destinations
  ALTER COLUMN destination_version SET NOT NULL,
  ALTER COLUMN material_identity_hash SET NOT NULL;

-- A destination whose material identity changes must be re-verified, so the
-- lifecycle needs an explicit state distinct from a brand-new unverified row.
ALTER TABLE wlt_payout_destinations
  DROP CONSTRAINT IF EXISTS wlt_payout_destinations_verification_status_chk;

ALTER TABLE wlt_payout_destinations
  ADD CONSTRAINT wlt_payout_destinations_verification_status_chk
  CHECK (destination_verification_status IN ('unverified', 'verified', 'requires_reverification', 'rejected'));

-- No legacy row can prove it identifies an official wallet: the value it holds
-- was captured under bank/mobile-money/manual semantics. Demote every verified
-- legacy row to explicit re-verification instead of inferring an official
-- wallet from it, and drop the stale verification attribution with it.
UPDATE wlt_payout_destinations
SET destination_verification_status = 'requires_reverification',
    destination_verified_at = NULL,
    destination_verified_by_operator_id = NULL
WHERE destination_verification_status = 'verified';

-- Verification requires a governed provider. Enforced as a constraint so no
-- write path can produce a verified destination without one.
ALTER TABLE wlt_payout_destinations
  DROP CONSTRAINT IF EXISTS wlt_payout_destinations_verified_provider_chk;

ALTER TABLE wlt_payout_destinations
  ADD CONSTRAINT wlt_payout_destinations_verified_provider_chk
  CHECK (destination_verification_status <> 'verified' OR official_wallet_provider_key IS NOT NULL);

ALTER TABLE wlt_payout_destinations
  DROP CONSTRAINT IF EXISTS wlt_payout_destinations_provider_fk;

ALTER TABLE wlt_payout_destinations
  ADD CONSTRAINT wlt_payout_destinations_provider_fk
  FOREIGN KEY (operator_context_id, official_wallet_provider_key)
  REFERENCES wlt_official_wallet_providers(operator_context_id, provider_key)
  NOT VALID;

ALTER TABLE wlt_payout_destinations
  VALIDATE CONSTRAINT wlt_payout_destinations_provider_fk;

-- The write path already retires the current active row before inserting a new
-- one, but nothing enforced it. Repair any pre-existing duplicate deterministically
-- (newest row stays active) before the invariant becomes a constraint.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY operator_context_id, owner_actor_type, owner_actor_id
           ORDER BY created_at DESC, id DESC
         ) AS rank
  FROM wlt_payout_destinations
  WHERE active = true
)
UPDATE wlt_payout_destinations AS d
SET active = false,
    superseded_at = now(),
    updated_at = now()
FROM ranked
WHERE d.id = ranked.id
  AND ranked.rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payout_destinations_active_owner_uidx
  ON wlt_payout_destinations (operator_context_id, owner_actor_type, owner_actor_id)
  WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payout_destinations_owner_version_uidx
  ON wlt_payout_destinations (operator_context_id, owner_actor_type, owner_actor_id, destination_version);

-- An approved snapshot must record which destination version the approver
-- actually reviewed, so a later version cannot be mistaken for the approved
-- one when the settlement batch and reconciliation evidence are compared.
ALTER TABLE wlt_approved_payout_snapshots
  ADD COLUMN IF NOT EXISTS destination_version integer;

UPDATE wlt_approved_payout_snapshots AS s
SET destination_version = d.destination_version
FROM wlt_payout_destinations AS d
WHERE d.operator_context_id = s.operator_context_id
  AND d.id = s.payout_destination_id
  AND s.destination_version IS NULL;

ALTER TABLE wlt_approved_payout_snapshots
  ALTER COLUMN destination_version SET NOT NULL;

COMMIT;
