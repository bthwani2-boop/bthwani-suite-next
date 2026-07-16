-- WLT-021: Reconciliation-case resolution surface.
--
-- wlt-015 added wlt_reconciliation_cases as an open-case record only,
-- explicitly deferring resolution. Every ambiguous provider outcome
-- (network timeout/unrecognized response during authorize or capture) has
-- since had no route to assign, review, or resolve it -- a case, once open,
-- stayed open forever with no API surface at all. This adds the columns a
-- resolve/assign flow needs; internal/reconciliation exposes the routes.

ALTER TABLE wlt_reconciliation_cases
  ADD COLUMN IF NOT EXISTS assigned_to_operator_id text,
  ADD COLUMN IF NOT EXISTS assigned_at             timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by_operator_id text,
  ADD COLUMN IF NOT EXISTS resolution_note         text,
  ADD COLUMN IF NOT EXISTS resolution_action       text;

ALTER TABLE wlt_reconciliation_cases
  DROP CONSTRAINT IF EXISTS wlt_reconciliation_cases_resolution_action_chk;

ALTER TABLE wlt_reconciliation_cases
  ADD CONSTRAINT wlt_reconciliation_cases_resolution_action_chk
  CHECK (resolution_action IS NULL OR resolution_action IN (
    'confirmed_success', 'confirmed_failed', 'manual_adjustment', 'ignored'
  ));

-- At most one open case per (payment_session_id, operation) -- prevents a
-- second ambiguous outcome on the same operation from silently piling up a
-- duplicate open case instead of surfacing on the existing one.
CREATE UNIQUE INDEX IF NOT EXISTS wlt_reconciliation_cases_open_unique_idx
  ON wlt_reconciliation_cases (payment_session_id, operation)
  WHERE status = 'open';
