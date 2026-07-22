-- Provider-owned Workforce documents are not partner documents. Existing
-- field/captain upload handlers and the employee handler store owner_actor_id
-- and owner_actor_role without a partner row, so the schema must express that
-- ownership model explicitly.
ALTER TABLE dsh_media_refs
  ALTER COLUMN partner_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS dsh_actor_service_area_scopes (
  actor_id          text        NOT NULL,
  actor_role        text        NOT NULL CHECK (actor_role IN ('field', 'captain')),
  service_area_code text        NOT NULL,
  active            boolean     NOT NULL DEFAULT true,
  assigned_by       text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, actor_role, service_area_code)
);

CREATE INDEX IF NOT EXISTS idx_dsh_actor_service_area_scopes_lookup
  ON dsh_actor_service_area_scopes(actor_id, actor_role, active, service_area_code);

CREATE TABLE IF NOT EXISTS dsh_workforce_scope_audit (
  id              bigserial   PRIMARY KEY,
  actor_id        text        NOT NULL,
  actor_role      text        NOT NULL CHECK (actor_role IN ('field', 'captain')),
  changed_by      text        NOT NULL,
  store_ids       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  service_areas   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  correlation_id  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsh_workforce_scope_audit_actor
  ON dsh_workforce_scope_audit(actor_id, actor_role, created_at DESC);
