-- DSH-029: Field Work Queue index
-- Supports GET /dsh/field/work-queue, which lists a field agent's own open
-- escalations across stores (in addition to the existing store_id/status
-- indexes on dsh_readiness_escalations).

CREATE INDEX IF NOT EXISTS idx_dsh_escalations_raised_by ON dsh_readiness_escalations(raised_by);
