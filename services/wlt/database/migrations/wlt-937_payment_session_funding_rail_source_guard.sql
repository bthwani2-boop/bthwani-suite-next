-- WLT-937: bind the external-wallet funding rail to wallet top-up sessions only.
--
-- `official_wallet` is not a purchase checkout tender. It represents the
-- external funding rail used by the governed top-up workflow. The database is
-- the final financial integrity boundary, so it must reject both directions of
-- semantic drift even if a caller bypasses the API contract.
--
-- Existing contradictory rows are never guessed or silently rewritten. The
-- migration fails closed so any historical inconsistency can be investigated
-- and repaired from authoritative evidence before this constraint is enabled.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_payment_sessions
    WHERE
      (topup_reference IS NOT NULL AND payment_method <> 'official_wallet')
      OR
      (topup_reference IS NULL AND payment_method = 'official_wallet')
  ) THEN
    RAISE EXCEPTION
      'wlt_payment_sessions contains funding-rail/source contradictions; repair authoritative historical data before applying WLT-937'
      USING ERRCODE = '23514';
  END IF;
END
$$;

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_funding_rail_source_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_funding_rail_source_chk
  CHECK (
    (topup_reference IS NOT NULL AND payment_method = 'official_wallet')
    OR
    (topup_reference IS NULL AND payment_method <> 'official_wallet')
  );
