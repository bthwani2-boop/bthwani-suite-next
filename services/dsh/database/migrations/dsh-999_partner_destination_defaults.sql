-- DSH-999: give the partner payout-destination columns creation-time defaults.
--
-- dsh-104_official_wallet_destination.sql backfilled destination_method,
-- masked_destination_reference and destination_verification_status from the
-- legacy settlement fields and then set all three NOT NULL, but gave none of them
-- a DEFAULT. Nothing populates them at creation time: the canonical partner
-- writer in services/dsh/backend/internal/partner/operator_context_repository.go
-- omits all three from its INSERT and reads them back with COALESCE(...,''),
-- because a payout destination is established later in the partner lifecycle.
--
-- Every partner INSERT that does not name these columns therefore failed with
-- "null value in column destination_method violates not-null constraint" — the
-- governed local seeds, the DSH database tests, and partner creation through the
-- real operator API alike.
--
-- The fix keeps the NOT NULL invariant dsh-104 intended and supplies the missing
-- defaults, matching payout_destination_id on this same table, which has always
-- been NOT NULL DEFAULT ''. destination_verification_status defaults to
-- 'unverified' rather than '' because dsh-104 also constrains it to
-- ('unverified','verified','rejected'), and an unestablished destination is
-- exactly an unverified one.
--
-- dsh-104 itself is left untouched: it has already applied in existing databases,
-- where an in-place amendment would never re-run. This is the forward correction.
ALTER TABLE dsh_partners
  ALTER COLUMN destination_method SET DEFAULT '',
  ALTER COLUMN masked_destination_reference SET DEFAULT '',
  ALTER COLUMN destination_verification_status SET DEFAULT 'unverified';
