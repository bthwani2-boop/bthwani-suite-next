-- DSH-1003: govern Field onboarding assignment priority, SLA and handoff.
ALTER TABLE dsh_field_onboarding_assignments
  ADD COLUMN IF NOT EXISTS business_task_key TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_minutes INTEGER NOT NULL DEFAULT 1440;

ALTER TABLE dsh_field_onboarding_assignments
  DROP CONSTRAINT IF EXISTS dsh_field_onboarding_assignments_priority_check;
ALTER TABLE dsh_field_onboarding_assignments
  ADD CONSTRAINT dsh_field_onboarding_assignments_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE dsh_field_onboarding_assignments
  DROP CONSTRAINT IF EXISTS dsh_field_onboarding_assignments_sla_minutes_check;
ALTER TABLE dsh_field_onboarding_assignments
  ADD CONSTRAINT dsh_field_onboarding_assignments_sla_minutes_check
  CHECK (sla_minutes > 0 AND sla_minutes <= 43200);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_field_onboarding_assignments_active_task
  ON dsh_field_onboarding_assignments (operator_context_id, business_task_key)
  WHERE business_task_key IS NOT NULL
    AND status IN ('assigned', 'in_progress', 'draft_linked');

ALTER TABLE dsh_field_onboarding_assignment_events
  DROP CONSTRAINT IF EXISTS dsh_field_onboarding_assignment_events_type_check;
ALTER TABLE dsh_field_onboarding_assignment_events
  ADD CONSTRAINT dsh_field_onboarding_assignment_events_type_check
  CHECK (event_type IN ('created', 'opened', 'handoff', 'reassigned', 'cancelled', 'draft_linked'));
