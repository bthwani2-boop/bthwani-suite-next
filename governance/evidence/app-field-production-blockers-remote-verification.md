# App Field Production Blockers — Remote Verification

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `work/smar-field-production-blockers-ci-v2-20260727`
- Commit: `307a6d722c631cd02eb4981266fcc7054b229e97`
- Workflow run: `30226701930`
- Generated at: `2026-07-27T00:08:38Z`

## Results

| Check | Exit code | Result |
|---|---:|---|
| `pnpm_install` | 0 | PASS |
| `app_field_typecheck` | 0 | PASS |
| `identity_typecheck` | 0 | PASS |
| `jrn024_source_guard` | 0 | PASS |
| `dsh_database_contract` | 0 | PASS |
| `gofmt` | 1 | FAIL |
| `go_unit` | 0 | PASS |
| `postgres_migrations` | 0 | PASS |
| `go_fieldreadiness_all` | 0 | PASS |

## Log tail

```text
CREATE TRIGGER
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-903_jrn_011_order_event_runtime.sql:73: NOTICE:  trigger "trg_dsh_jrn011_order_event_outbox" for relation "dsh_order_status_events" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
COMMIT
Applying services/dsh/database/migrations/dsh-904_jrn_011_order_truth_audit.sql
BEGIN
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-904_jrn_011_order_truth_audit.sql:49: NOTICE:  trigger "trg_dsh_jrn011_validate_audit_metadata" for relation "dsh_order_truth_audit" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
COMMIT
Applying services/dsh/database/migrations/dsh-905_jrn_011_payment_projection_reconciliation.sql
BEGIN
ALTER TABLE
CREATE TABLE
CREATE INDEX
INSERT 0 0
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-905_jrn_011_payment_projection_reconciliation.sql:55: NOTICE:  trigger "trg_dsh_jrn011_schedule_payment_projection" for relation "dsh_orders" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
COMMIT
Applying services/dsh/database/migrations/dsh-906_jrn_006_client_address_geofence_binding.sql
BEGIN
CREATE FUNCTION
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-906_jrn_006_client_address_geofence_binding.sql:118: NOTICE:  trigger "trg_dsh_client_address_service_area" for relation "dsh_client_addresses" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
COMMENT
COMMIT
Applying services/dsh/database/migrations/dsh-907_jrn_005_address_mutation_receipts.sql
BEGIN
CREATE TABLE
CREATE INDEX
COMMENT
COMMIT
Applying services/dsh/database/migrations/dsh-907_jrn_006_service_area_topology.sql
BEGIN
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
DO
psql:services/dsh/database/migrations/dsh-907_jrn_006_service_area_topology.sql:147: NOTICE:  constraint "dsh_service_area_geofences_polygon_topology_check" of relation "dsh_service_area_geofences" does not exist, skipping
ALTER TABLE
ALTER TABLE
COMMIT
Applying services/dsh/database/migrations/dsh-908_jrn_005_mutation_receipt_retention.sql
BEGIN
ALTER TABLE
UPDATE 0
ALTER TABLE
CREATE INDEX
CREATE FUNCTION
COMMENT
COMMENT
COMMIT
Applying services/dsh/database/migrations/dsh-908_jrn_006_privacy_audit_projection.sql
BEGIN
CREATE VIEW
COMMENT
COMMIT
Applying services/dsh/database/migrations/dsh-910_jrn_010_wlt_event_receipts.sql
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-910_jrn_010_wlt_event_receipts.sql:29: NOTICE:  constraint "dsh_checkout_intents_last_wlt_status_chk" of relation "dsh_checkout_intents" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-910_jrn_010_wlt_event_receipts.sql:40: NOTICE:  constraint "dsh_checkout_intents_reconciliation_attempt_count_chk" of relation "dsh_checkout_intents" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-910_jrn_010_wlt_event_receipts.sql:102: NOTICE:  trigger "trg_dsh_guard_checkout_wlt_event_receipt" for relation "dsh_checkout_wlt_event_receipts" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
Applying services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql
BEGIN
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
DO
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_catalog_domains_catalog_audit" for relation "dsh_catalog_domains" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_catalog_nodes_catalog_audit" for relation "dsh_catalog_nodes" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_master_products_catalog_audit" for relation "dsh_master_products" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_master_product_attribute_values_catalog_audit" for relation "dsh_master_product_attribute_values" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_master_product_relationships_catalog_audit" for relation "dsh_master_product_relationships" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_store_assortments_catalog_audit" for relation "dsh_store_assortments" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_product_proposals_catalog_audit" for relation "dsh_product_proposals" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_catalog_platform_policies_catalog_audit" for relation "dsh_catalog_platform_policies" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_catalog_assets_catalog_audit" for relation "dsh_catalog_assets" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_catalog_asset_links_catalog_audit" for relation "dsh_catalog_asset_links" does not exist, skipping
psql:services/dsh/database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql:163: NOTICE:  trigger "trg_dsh_reels_catalog_audit" for relation "dsh_reels" does not exist, skipping
DO
CREATE FUNCTION
COMMIT
Applying services/dsh/database/migrations/dsh-931_jrn_008_assortment_pause_restore.sql
BEGIN
ALTER TABLE
UPDATE 0
COMMIT
Applying services/dsh/database/migrations/dsh-932_jrn_008_audit_trigger_safety.sql
BEGIN
CREATE FUNCTION
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-932_jrn_008_audit_trigger_safety.sql:60: NOTICE:  trigger "trg_dsh_store_assortments_pause_restore_state" for relation "dsh_store_assortments" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
COMMIT
Applying services/dsh/database/migrations/dsh-933_jrn030_partner_fleet_action_audit.sql
BEGIN
CREATE FUNCTION
COMMIT
Applying services/dsh/database/migrations/dsh-950_catalog_approval_actor_scope.sql
ALTER TABLE
UPDATE 0
ALTER TABLE
psql:services/dsh/database/migrations/dsh-950_catalog_approval_actor_scope.sql:16: NOTICE:  constraint "dsh_catalog_approval_records_owner_actor_id_nonempty" of relation "dsh_catalog_approval_records" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE INDEX
Applying services/dsh/database/migrations/dsh-951_catalog_approval_tenant_scope.sql
ALTER TABLE
UPDATE 0
ALTER TABLE
psql:services/dsh/database/migrations/dsh-951_catalog_approval_tenant_scope.sql:16: NOTICE:  constraint "dsh_catalog_approval_records_tenant_id_nonempty" of relation "dsh_catalog_approval_records" does not exist, skipping
ALTER TABLE
ALTER TABLE
DROP INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
Applying services/dsh/database/migrations/dsh-952_partner_soft_archive.sql
ALTER TABLE
CREATE INDEX
Applying services/dsh/database/migrations/dsh-953_partner_offers_store_id_text.sql
DROP TRIGGER
ALTER TABLE
CREATE TRIGGER
Applying services/dsh/database/migrations/dsh-954_trusted_tenant_session_context.sql
CREATE FUNCTION
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-954_trusted_tenant_session_context.sql:43: NOTICE:  trigger "trg_dsh_partners_tenant" for relation "dsh_partners" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-954_trusted_tenant_session_context.sql:96: NOTICE:  trigger "trg_dsh_stores_tenant" for relation "dsh_stores" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
Applying services/dsh/database/migrations/dsh-955_pickup_window_extension_policy.sql
BEGIN
ALTER TABLE
COMMIT
Applying services/dsh/database/migrations/dsh-956_operational_incident.sql
BEGIN
CREATE TABLE
CREATE INDEX
CREATE INDEX
COMMIT
Applying services/dsh/database/migrations/dsh-957_delivery_pickup_sla_alerts.sql
BEGIN
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
COMMIT
Applying services/dsh/database/migrations/dsh-958_field_readiness_mutation_idempotency.sql
BEGIN
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
psql:services/dsh/database/migrations/dsh-958_field_readiness_mutation_idempotency.sql:53: NOTICE:  constraint "dsh_field_visits_create_idempotency_pair_chk" of relation "dsh_field_visits" does not exist, skipping
psql:services/dsh/database/migrations/dsh-958_field_readiness_mutation_idempotency.sql:53: NOTICE:  constraint "dsh_field_visits_completion_idempotency_pair_chk" of relation "dsh_field_visits" does not exist, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-958_field_readiness_mutation_idempotency.sql:61: NOTICE:  constraint "dsh_readiness_checks_mutation_idempotency_pair_chk" of relation "dsh_readiness_checks" does not exist, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-958_field_readiness_mutation_idempotency.sql:69: NOTICE:  constraint "dsh_readiness_escalations_create_idempotency_pair_chk" of relation "dsh_readiness_escalations" does not exist, skipping
ALTER TABLE
COMMIT
Applying services/dsh/database/migrations/dsh-958_partner_workspace_store_ownership.sql
CREATE TABLE
CREATE INDEX
ALTER TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-958_partner_workspace_store_ownership.sql:93: NOTICE:  trigger "trg_dsh_enforce_partner_store_tenant_match" for relation "dsh_stores" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE VIEW
Applying services/dsh/database/migrations/dsh-959_field_readiness_operation_receipts.sql
BEGIN
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMIT
Applying services/dsh/database/migrations/dsh-959_governed_partner_store_transfer.sql
CREATE FUNCTION
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-959_governed_partner_store_transfer.sql:47: NOTICE:  trigger "dsh_stores_partner_transfer_audit_guard" for relation "dsh_stores" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER

===== go_fieldreadiness_all =====
ok  	dsh-api/internal/fieldreadiness	0.004s
```
