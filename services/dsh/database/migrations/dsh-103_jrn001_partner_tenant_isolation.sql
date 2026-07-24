-- DSH-103 / JRN-001: partner onboarding tenant isolation.
--
-- Existing rows predate tenant-aware Identity sessions. They are assigned once to
-- the canonical local migration tenant so the upgrade is deterministic. Runtime
-- requests do not receive a tenant default: new rows must derive tenant ownership
-- from an already-owned parent or provide trusted server-side tenant context.

ALTER TABLE dsh_partners ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE dsh_partner_documents ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE dsh_partner_document_reviews ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE dsh_partner_field_visits ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE dsh_partner_activation_events ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE dsh_partner_store_visibility_events ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE dsh_store_actor_scopes ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- One-time legacy classification. This is migration data ownership, not a
-- request-time fallback and is intentionally not installed as a column default.
UPDATE dsh_partners
SET tenant_id = 'local-dsh'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

UPDATE dsh_stores s
SET tenant_id = COALESCE(NULLIF(btrim(p.tenant_id), ''), 'local-dsh')
FROM dsh_partners p
WHERE s.partner_id = p.id
  AND (s.tenant_id IS NULL OR btrim(s.tenant_id) = '');

UPDATE dsh_stores
SET tenant_id = 'local-dsh'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

UPDATE dsh_partner_documents child
SET tenant_id = parent.tenant_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.tenant_id IS NULL OR btrim(child.tenant_id) = '');

UPDATE dsh_partner_document_reviews child
SET tenant_id = parent.tenant_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.tenant_id IS NULL OR btrim(child.tenant_id) = '');

UPDATE dsh_partner_field_visits child
SET tenant_id = parent.tenant_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.tenant_id IS NULL OR btrim(child.tenant_id) = '');

UPDATE dsh_partner_activation_events child
SET tenant_id = parent.tenant_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.tenant_id IS NULL OR btrim(child.tenant_id) = '');

UPDATE dsh_partner_store_visibility_events child
SET tenant_id = parent.tenant_id
FROM dsh_partners parent
WHERE child.partner_id = parent.id
  AND (child.tenant_id IS NULL OR btrim(child.tenant_id) = '');

UPDATE dsh_store_actor_scopes child
SET tenant_id = parent.tenant_id
FROM dsh_stores parent
WHERE child.store_id = parent.id
  AND (child.tenant_id IS NULL OR btrim(child.tenant_id) = '');

ALTER TABLE dsh_partners ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE dsh_stores ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE dsh_partner_documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE dsh_partner_document_reviews ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE dsh_partner_field_visits ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE dsh_partner_activation_events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE dsh_partner_store_visibility_events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE dsh_store_actor_scopes ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dsh_partners_tenant_nonempty') THEN
    ALTER TABLE dsh_partners ADD CONSTRAINT dsh_partners_tenant_nonempty CHECK (btrim(tenant_id) <> '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dsh_stores_tenant_nonempty') THEN
    ALTER TABLE dsh_stores ADD CONSTRAINT dsh_stores_tenant_nonempty CHECK (btrim(tenant_id) <> '');
  END IF;
END $$;

-- Legal identities are unique inside a tenant, not across the entire SaaS.
ALTER TABLE dsh_partners DROP CONSTRAINT IF EXISTS dsh_partners_legal_identity_unique;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_partners_tenant_legal_identity
  ON dsh_partners(tenant_id, legal_identity_type, legal_identity_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_partners_id_tenant
  ON dsh_partners(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_stores_id_tenant
  ON dsh_stores(id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partners_tenant_status_created
  ON dsh_partners(tenant_id, activation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_stores_tenant_partner
  ON dsh_stores(tenant_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_documents_tenant_partner
  ON dsh_partner_documents(tenant_id, partner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_field_visits_tenant_partner
  ON dsh_partner_field_visits(tenant_id, partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_activation_events_tenant_partner
  ON dsh_partner_activation_events(tenant_id, partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_store_actor_scopes_tenant_actor
  ON dsh_store_actor_scopes(tenant_id, actor_id, actor_role, active, store_id);

-- Child ownership is always derived from the owning partner. A caller cannot
-- move a child into another tenant by supplying a tenant_id value.
CREATE OR REPLACE FUNCTION dsh_enforce_partner_child_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_tenant TEXT;
BEGIN
  SELECT tenant_id INTO owner_tenant
  FROM dsh_partners
  WHERE id = NEW.partner_id;

  IF owner_tenant IS NULL OR btrim(owner_tenant) = '' THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED: partner tenant not found';
  END IF;

  NEW.tenant_id := owner_tenant;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_enforce_store_scope_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_tenant TEXT;
BEGIN
  SELECT tenant_id INTO owner_tenant
  FROM dsh_stores
  WHERE id = NEW.store_id;

  IF owner_tenant IS NULL OR btrim(owner_tenant) = '' THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED: store tenant not found';
  END IF;

  NEW.tenant_id := owner_tenant;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_enforce_store_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_tenant TEXT;
BEGIN
  IF NEW.partner_id IS NOT NULL AND btrim(NEW.partner_id) <> '' THEN
    SELECT tenant_id INTO owner_tenant
    FROM dsh_partners
    WHERE id = NEW.partner_id;
    IF owner_tenant IS NULL OR btrim(owner_tenant) = '' THEN
      RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED: partner tenant not found';
    END IF;
    NEW.tenant_id := owner_tenant;
  ELSIF NEW.tenant_id IS NULL OR btrim(NEW.tenant_id) = '' THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED: trusted store tenant is required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_partner_documents_tenant ON dsh_partner_documents;
CREATE TRIGGER trg_dsh_partner_documents_tenant
BEFORE INSERT OR UPDATE OF partner_id, tenant_id ON dsh_partner_documents
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_tenant();

DROP TRIGGER IF EXISTS trg_dsh_partner_document_reviews_tenant ON dsh_partner_document_reviews;
CREATE TRIGGER trg_dsh_partner_document_reviews_tenant
BEFORE INSERT OR UPDATE OF partner_id, tenant_id ON dsh_partner_document_reviews
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_tenant();

DROP TRIGGER IF EXISTS trg_dsh_partner_field_visits_tenant ON dsh_partner_field_visits;
CREATE TRIGGER trg_dsh_partner_field_visits_tenant
BEFORE INSERT OR UPDATE OF partner_id, tenant_id ON dsh_partner_field_visits
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_tenant();

DROP TRIGGER IF EXISTS trg_dsh_partner_activation_events_tenant ON dsh_partner_activation_events;
CREATE TRIGGER trg_dsh_partner_activation_events_tenant
BEFORE INSERT OR UPDATE OF partner_id, tenant_id ON dsh_partner_activation_events
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_tenant();

DROP TRIGGER IF EXISTS trg_dsh_partner_store_visibility_events_tenant ON dsh_partner_store_visibility_events;
CREATE TRIGGER trg_dsh_partner_store_visibility_events_tenant
BEFORE INSERT OR UPDATE OF partner_id, tenant_id ON dsh_partner_store_visibility_events
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_child_tenant();

DROP TRIGGER IF EXISTS trg_dsh_stores_tenant ON dsh_stores;
CREATE TRIGGER trg_dsh_stores_tenant
BEFORE INSERT OR UPDATE OF partner_id, tenant_id ON dsh_stores
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_store_tenant();

DROP TRIGGER IF EXISTS trg_dsh_store_actor_scopes_tenant ON dsh_store_actor_scopes;
CREATE TRIGGER trg_dsh_store_actor_scopes_tenant
BEFORE INSERT OR UPDATE OF store_id, tenant_id ON dsh_store_actor_scopes
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_store_scope_tenant();
