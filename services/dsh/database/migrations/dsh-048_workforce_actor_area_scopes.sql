-- Provider-owned Workforce documents are not partner documents. Existing
-- field/captain upload handlers and the employee handler store owner_actor_id
-- and owner_actor_role without a partner row, so the schema must express that
-- ownership model explicitly.
ALTER TABLE dsh_media_refs
  ALTER COLUMN partner_id DROP NOT NULL;

