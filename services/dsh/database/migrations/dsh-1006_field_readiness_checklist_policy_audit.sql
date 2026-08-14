-- DSH-1006: enforce critical-evidence semantics and retain policy audit history.

ALTER TABLE dsh_readiness_checklist_template_items
  ADD CONSTRAINT dsh_readiness_template_items_critical_evidence_chk
  CHECK (NOT critical OR (required AND evidence_required));

ALTER TABLE dsh_visit_checklist_requirements
  ADD CONSTRAINT dsh_visit_checklist_requirements_critical_evidence_chk
  CHECK (NOT critical OR (required AND evidence_required));

CREATE TABLE dsh_readiness_checklist_policy_events (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID        NOT NULL REFERENCES dsh_readiness_checklist_templates(id) ON DELETE CASCADE,
  operator_context_id  TEXT        NOT NULL,
  business_vertical_id TEXT        NOT NULL,
  version              INTEGER     NOT NULL CHECK (version > 0),
  changed_by           TEXT        NOT NULL,
  items_snapshot       JSONB       NOT NULL CHECK (jsonb_typeof(items_snapshot) = 'array'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, version)
);

CREATE INDEX idx_dsh_readiness_checklist_policy_events_scope
  ON dsh_readiness_checklist_policy_events(operator_context_id, business_vertical_id, version DESC);
