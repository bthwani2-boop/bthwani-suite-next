-- Captain/field provider documents (license, vehicle photos) uploaded from
-- the Workforce HR/create screens are not tied to any dsh_partners row —
-- unlike partner/store document uploads, which dsh_media_refs was
-- originally modeled for. partner_id becomes optional so provider-owned
-- uploads (owner_actor_role IN ('field','captain'), purpose =
-- 'provider_document') can register a media reference without a partner.
ALTER TABLE dsh_media_refs ALTER COLUMN partner_id DROP NOT NULL;
