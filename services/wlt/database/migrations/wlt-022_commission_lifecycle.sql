-- WLT-022: Commission lifecycle columns.
--
-- wlt_commissions already declares a rich status vocabulary
-- (pending/confirmed/settled/reversed/rejected/...) but only CreateCommission
-- ever wrote a row -- no approve/settle/reverse/reject handler existed, so
-- every status past 'pending' was dead. This adds updated_at (missing
-- entirely) and an operator/reason audit trail for the new transitions in
-- internal/cod's Confirm/Settle/Reject/Reverse commission handlers.

ALTER TABLE wlt_commissions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text;
