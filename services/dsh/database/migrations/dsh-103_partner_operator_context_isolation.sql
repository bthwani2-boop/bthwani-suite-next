-- DSH-103 / : partner onboarding OperatorContext isolation.
--
-- Existing rows predate OperatorContext-aware Identity sessions. They are assigned once to
-- the canonical local migration OperatorContext so the upgrade is deterministic. Runtime
-- requests do not receive a OperatorContext default: new rows must derive OperatorContext ownership
-- from an already-owned parent or provide trusted server-side OperatorContext context.

ALTER TABLE dsh_partners ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_partner_documents ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_partner_document_reviews ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_partner_field_visits ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_partner_activation_events ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_partner_store_visibility_events ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_store_actor_scopes ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

-- One-time legacy classification. This is migration data ownership, not a
-- request-time fallback and is intentionally not installed as a column default.
UPDATE dsh_partners
SET operator_context_id = 'local-dsh'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

UPDATE dsh_stores s
SET operator_context_id = COALESCE(NULLIF(btrim(p.operator_context_id), ''), 'local-dsh')
FROM dsh_partners p
WHERE s.partner_id = p.id
  AND (s.operator_context_id IS NULL OR btrim(s.operator_context_id) = '');

UPDATE dsh_stores
SET operator_context_id = 'local-dsh'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

UPDATE dsh_partner_documents child
SET operator_context_id = parent.operator_context_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.operator_context_id IS NULL OR btrim(child.operator_context_id) = '');

UPDATE dsh_partner_document_reviews child
SET operator_context_id = parent.operator_context_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.operator_context_id IS NULL OR btrim(child.operator_context_id) = '');

UPDATE dsh_partner_field_visits child
SET operator_context_id = parent.operator_context_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.operator_context_id IS NULL OR btrim(child.operator_context_id) = '');

UPDATE dsh_partner_activation_events child
SET operator_context_id = parent.operator_context_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.operator_context_id IS NULL OR btrim(child.operator_context_id) = '');

UPDATE dsh_partner_store_visibility_events child
SET operator_context_id = parent.operator_context_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.operator_context_id IS NULL OR btrim(child.operator_context_id) = '');

UPDATE dsh_store_actor_scopes child
SET operator_context_id = parent.operator_context_id
FROM dsh_stores parent
WHERE child.store_id = parent.id
  AND (child.operator_context_id IS NULL OR btrim(child.operator_context_id) = '');

ALTER TABLE dsh_partners ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_stores ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_partner_documents ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_partner_document_reviews ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_partner_field_visits ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_partner_activation_events ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_partner_store_visibility_events ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_store_actor_scopes ALTER COLUMN operator_context_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dsh_partners_OperatorContext_nonempty') THEN
    ALTER TABLE dsh_partners ADD CONSTRAINT dsh_partners_OperatorContext_nonempty CHECK (btrim(operator_context_id) <> '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dsh_stores_OperatorContext_nonempty') THEN
    ALTER TABLE dsh_stores ADD CONSTRAINT dsh_stores_OperatorContext_nonempty CHECK (btrim(operator_context_id) <> '');
  END IF;
END $$;

-- Legal identities are unique inside a OperatorContext, not across the entire partner_platform.
ALTER TABLE dsh_partners DROP CONSTRAINT IF EXISTS dsh_partners_legal_identity_unique;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_partners_OperatorContext_legal_identity
  ON dsh_partners(operator_context_id, legal_identity_type, legal_identity_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_partners_id_OperatorContext
  ON dsh_partners(id, operator_context_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_stores_id_OperatorContext
  ON dsh_stores(id, operator_context_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partners_OperatorContext_status_created
  ON dsh_partners(operator_context_id, activation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_stores_OperatorContext_partner
  ON dsh_stores(operator_context_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_documents_OperatorContext_partner
  ON dsh_partner_documents(operator_context_id, partner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_field_visits_OperatorContext_partner
  ON dsh_partner_field_visits(operator_context_id, partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_activation_events_OperatorContext_partner
  ON dsh_partner_activation_events(operator_context_id, partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_store_actor_scopes_OperatorContext_actor
  ON dsh_store_actor_scopes(operator_context_id, actor_id, actor_role, active, store_id);

-- Child ownership is always derived from the owning partner. A caller cannot
-- move a child into another OperatorContext by supplying a operator_context_id value.
CREATE OR REPLACE FUNCTION dsh_enforce_partner_child_OperatorContext()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_OperatorContext TEXT;
BEGIN
  SELECT operator_context_id INTO owner_OperatorContext
  FROM dsh_partners
  WHERE id = NEW.partner_id;

  IF owner_OperatorContext IS NULL OR btrim(owner_OperatorContext) = '' THEN
    RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: partner OperatorContext not found';
  END IF;

  NEW.operator_context_id := owner_OperatorContext;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_enforce_store_scope_OperatorContext()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_OperatorContext TEXT;
BEGIN
  SELECT operator_context_id INTO owner_OperatorContext
  FROM dsh_stores
  WHERE id = NEW.store_id;

  IF owner_OperatorContext IS NULL OR btrim(owner_OperatorContext) = '' THEN
    RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: store OperatorContext not found';
  END IF;

  NEW.operator_context_id := owner_OperatorContext;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_enforce_store_OperatorContext()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_OperatorContext TEXT;
BEGIN
  IF NEW.partner_id IS NOT NULL AND btrim(NEW.partner_id) <> '' THEN
    SELECT operator_context_id INTO owner_OperatorContext
    FROM dsh_partners
    WHERE id = NEW.partner_id;
    IF owner_OperatorContext IS NULL OR btrim(owner_OperatorContext) = '' THEN
      RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: partner OperatorContext not found';
    END IF;
    NEW.operator_context_id := owner_OperatorContext;
  ELSIF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
    RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: trusted store OperatorContext is required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_partner_documents_OperatorContext ON dsh_partner_documents;
CREATE TRIGGER trg_dsh_partner_documents_OperatorContext
BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON dsh_partner_documents
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_OperatorContext();

DROP TRIGGER IF EXISTS trg_dsh_partner_document_reviews_OperatorContext ON dsh_partner_document_reviews;
CREATE TRIGGER trg_dsh_partner_document_reviews_OperatorContext
BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON dsh_partner_document_reviews
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_OperatorContext();

DROP TRIGGER IF EXISTS trg_dsh_partner_field_visits_OperatorContext ON dsh_partner_field_visits;
CREATE TRIGGER trg_dsh_partner_field_visits_OperatorContext
BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON dsh_partner_field_visits
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_OperatorContext();

DROP TRIGGER IF EXISTS trg_dsh_partner_activation_events_OperatorContext ON dsh_partner_activation_events;
CREATE TRIGGER trg_dsh_partner_activation_events_OperatorContext
BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON dsh_partner_activation_events
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_OperatorContext();

DROP TRIGGER IF EXISTS trg_dsh_partner_store_visibility_events_OperatorContext ON dsh_partner_store_visibility_events;
CREATE TRIGGER trg_dsh_partner_store_visibility_events_OperatorContext
BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON dsh_partner_store_visibility_events
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_OperatorContext();

DROP TRIGGER IF EXISTS trg_dsh_stores_OperatorContext ON dsh_stores;
CREATE TRIGGER trg_dsh_stores_OperatorContext
BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON dsh_stores
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_store_OperatorContext();

DROP TRIGGER IF EXISTS trg_dsh_store_actor_scopes_OperatorContext ON dsh_store_actor_scopes;
CREATE TRIGGER trg_dsh_store_actor_scopes_OperatorContext
BEFORE INSERT OR UPDATE OF store_id, operator_context_id ON dsh_store_actor_scopes
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_store_scope_OperatorContext();
