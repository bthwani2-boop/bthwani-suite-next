-- DSH-967: Drop confirmed-dead governance/audit tables (X3).
--
-- Each table below has zero Go references anywhere in
-- services/dsh/backend/internal (no INSERT/UPDATE/SELECT in any non-test
-- file) and zero incoming foreign keys from any other table:
--   * dsh_catalog_collection_items (dsh-032) -- the "smart collection"
--     curation feature was never wired to a handler; dsh_catalog_collections
--     itself (its parent) is untouched by this migration.
--   * dsh_coupon_funding_policy_audit (dsh-075) -- superseded by the live
--     coupon funding ownership path, never written to.
--   * dsh_partner_store_visibility_events (dsh-015) -- superseded by the
--     live dsh_partner_store_transfer_audit (dsh-958), never written to.
--     Its BEFORE INSERT/UPDATE OperatorContext-match trigger (dsh-103) is
--     dropped automatically with the table; it was never populated.
--     database/tests/schema/002_operator_context_isolation_contract.test.sql
--     is updated in the same change to drop it from the required-table list.
--
-- Note: the dsh-002b "storefront catalog" tables (dsh_catalog_products,
-- dsh_catalog_categories, dsh_catalog_media, dsh_catalog_audit,
-- dsh_catalog_revisions, dsh_categories) and dsh_marketing_banners /
-- dsh_marketing_promos were already retired by dsh-036 and dsh-018
-- respectively -- they no longer exist and are not touched here.
-- dsh_catalog_legacy_archive (created by dsh-036) is a deliberate permanent
-- forensic archive, not dead code, and must never be dropped.

DO $$
DECLARE
  dead_row_count integer;
  total_dead_rows integer := 0;
BEGIN
  SELECT count(*) INTO dead_row_count FROM dsh_catalog_collection_items; total_dead_rows := total_dead_rows + dead_row_count;
  SELECT count(*) INTO dead_row_count FROM dsh_coupon_funding_policy_audit; total_dead_rows := total_dead_rows + dead_row_count;
  SELECT count(*) INTO dead_row_count FROM dsh_partner_store_visibility_events; total_dead_rows := total_dead_rows + dead_row_count;

  IF total_dead_rows > 0 THEN
    RAISE EXCEPTION 'dsh-967: refusing to drop dead tables that together hold % row(s); this contradicts the "zero Go reference" analysis and needs investigation before the migration can proceed', total_dead_rows;
  END IF;
END $$;

DROP TABLE IF EXISTS dsh_catalog_collection_items;
DROP TABLE IF EXISTS dsh_coupon_funding_policy_audit;
DROP TABLE IF EXISTS dsh_partner_store_visibility_events;
