-- DSH-1004: server-owned, Business-Vertical field-readiness checklist policy.
-- Templates are mutable policy; every visit receives an immutable item snapshot.

CREATE TABLE IF NOT EXISTS dsh_readiness_checklist_templates (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_context_id  TEXT        NOT NULL,
  business_vertical_id TEXT        NOT NULL,
  version              INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by            TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_context_id, business_vertical_id)
);

CREATE TABLE IF NOT EXISTS dsh_readiness_checklist_template_items (
  template_id       UUID        NOT NULL REFERENCES dsh_readiness_checklist_templates(id) ON DELETE CASCADE,
  check_type        TEXT        NOT NULL CHECK (btrim(check_type) ~ '^[a-z][a-z0-9_]{2,63}$'),
  label_ar          TEXT        NOT NULL CHECK (char_length(btrim(label_ar)) BETWEEN 2 AND 160),
  required          BOOLEAN     NOT NULL DEFAULT TRUE,
  critical          BOOLEAN     NOT NULL DEFAULT FALSE,
  evidence_required BOOLEAN     NOT NULL DEFAULT TRUE,
  display_order     INTEGER     NOT NULL CHECK (display_order BETWEEN 0 AND 1000),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (template_id, check_type),
  UNIQUE (template_id, display_order),
  CHECK (NOT critical OR required)
);

CREATE TABLE IF NOT EXISTS dsh_visit_checklist_requirements (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id             UUID        NOT NULL REFERENCES dsh_field_visits(id) ON DELETE CASCADE,
  template_id          UUID        NOT NULL REFERENCES dsh_readiness_checklist_templates(id),
  template_version     INTEGER     NOT NULL CHECK (template_version > 0),
  business_vertical_id TEXT        NOT NULL,
  check_type           TEXT        NOT NULL,
  label_ar             TEXT        NOT NULL,
  required             BOOLEAN     NOT NULL,
  critical             BOOLEAN     NOT NULL,
  evidence_required    BOOLEAN     NOT NULL,
  display_order        INTEGER     NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (visit_id, check_type),
  UNIQUE (visit_id, display_order),
  CHECK (NOT critical OR required)
);

CREATE INDEX IF NOT EXISTS idx_dsh_readiness_templates_scope
  ON dsh_readiness_checklist_templates(operator_context_id, business_vertical_id);
CREATE INDEX IF NOT EXISTS idx_dsh_visit_checklist_requirements_visit
  ON dsh_visit_checklist_requirements(visit_id, display_order);

ALTER TABLE dsh_readiness_checks
  DROP CONSTRAINT IF EXISTS dsh_readiness_checks_check_type_check;

WITH verticals(business_vertical_id) AS (
  VALUES ('default'), ('domain-restaurants'), ('domain-groceries'), ('domain-pharmacy')
), inserted AS (
  INSERT INTO dsh_readiness_checklist_templates
    (operator_context_id, business_vertical_id, updated_by)
  SELECT 'system-default', business_vertical_id, 'migration:dsh-1004'
  FROM verticals
  ON CONFLICT (operator_context_id, business_vertical_id) DO NOTHING
  RETURNING id
)
INSERT INTO dsh_readiness_checklist_template_items
  (template_id, check_type, label_ar, required, critical, evidence_required, display_order)
SELECT template.id, item.check_type, item.label_ar, TRUE, item.critical, TRUE, item.display_order
FROM dsh_readiness_checklist_templates template
CROSS JOIN (VALUES
  ('location_verified',      'التحقق من الموقع',             TRUE,  10),
  ('documents_uploaded',     'رفع المستندات المطلوبة',       TRUE,  20),
  ('product_list_submitted', 'تقديم قائمة المنتجات',         FALSE, 30),
  ('equipment_checked',      'فحص التجهيزات',                FALSE, 40),
  ('safety_compliant',       'الالتزام بمتطلبات السلامة',    TRUE,  50),
  ('hygiene_compliant',      'الالتزام بمتطلبات النظافة',    TRUE,  60)
) AS item(check_type, label_ar, critical, display_order)
WHERE template.operator_context_id = 'system-default'
ON CONFLICT (template_id, check_type) DO NOTHING;

-- Existing open visits predate snapshotting. Bind them once to the applicable
-- immutable system template so rollout cannot weaken or strand their checks.
INSERT INTO dsh_visit_checklist_requirements
  (visit_id, template_id, template_version, business_vertical_id, check_type,
   label_ar, required, critical, evidence_required, display_order)
SELECT visit.id, template.id, template.version, template.business_vertical_id,
       item.check_type, item.label_ar, item.required, item.critical,
       item.evidence_required, item.display_order
FROM dsh_field_visits visit
JOIN dsh_stores store ON store.id = visit.store_id
LEFT JOIN dsh_partners partner ON partner.id = store.partner_id
JOIN LATERAL (
  SELECT candidate.*
  FROM dsh_readiness_checklist_templates candidate
  WHERE candidate.operator_context_id = 'system-default'
    AND candidate.business_vertical_id IN (
      COALESCE(partner.business_vertical_id, store.catalog_domain_id, 'default'),
      'default'
    )
  ORDER BY CASE WHEN candidate.business_vertical_id = COALESCE(partner.business_vertical_id, store.catalog_domain_id, '') THEN 0 ELSE 1 END
  LIMIT 1
) template ON TRUE
JOIN dsh_readiness_checklist_template_items item ON item.template_id = template.id
ON CONFLICT (visit_id, check_type) DO NOTHING;
