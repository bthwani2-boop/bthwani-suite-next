-- DSH-099: retain JRN-001 audit and evidence.
-- Partner onboarding evidence is immutable operational history. Deleting a
-- partner, reviewed document, or published store must not cascade-delete the
-- actor, decision, and correlation trail used for review and incident analysis.

ALTER TABLE dsh_partner_activation_events
  DROP CONSTRAINT IF EXISTS dsh_partner_activation_events_partner_id_fkey;
ALTER TABLE dsh_partner_activation_events
  ADD CONSTRAINT dsh_partner_activation_events_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES dsh_partners(id) ON DELETE RESTRICT;

ALTER TABLE dsh_partner_store_visibility_events
  DROP CONSTRAINT IF EXISTS dsh_partner_store_visibility_events_partner_id_fkey;
ALTER TABLE dsh_partner_store_visibility_events
  ADD CONSTRAINT dsh_partner_store_visibility_events_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES dsh_partners(id) ON DELETE RESTRICT;

ALTER TABLE dsh_partner_store_visibility_events
  DROP CONSTRAINT IF EXISTS dsh_partner_store_visibility_events_store_id_fkey;
ALTER TABLE dsh_partner_store_visibility_events
  ADD CONSTRAINT dsh_partner_store_visibility_events_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES dsh_stores(id) ON DELETE RESTRICT;

ALTER TABLE dsh_partner_document_reviews
  DROP CONSTRAINT IF EXISTS dsh_partner_document_reviews_partner_id_fkey;
ALTER TABLE dsh_partner_document_reviews
  ADD CONSTRAINT dsh_partner_document_reviews_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES dsh_partners(id) ON DELETE RESTRICT;

ALTER TABLE dsh_partner_document_reviews
  DROP CONSTRAINT IF EXISTS dsh_partner_document_reviews_document_id_fkey;
ALTER TABLE dsh_partner_document_reviews
  ADD CONSTRAINT dsh_partner_document_reviews_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES dsh_partner_documents(id) ON DELETE RESTRICT;

ALTER TABLE dsh_partner_field_visits
  DROP CONSTRAINT IF EXISTS dsh_partner_field_visits_partner_id_fkey;
ALTER TABLE dsh_partner_field_visits
  ADD CONSTRAINT dsh_partner_field_visits_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES dsh_partners(id) ON DELETE RESTRICT;
