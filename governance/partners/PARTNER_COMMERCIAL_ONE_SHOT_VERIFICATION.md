# Partner Commercial One-shot Verification

```text

## Resolved commit
9636e98f59c91f50379346fa8748a89e3a2edccf

exit_code=0

## Clean DSH migrations

### services/dsh/database/migrations/dsh-001_store_discovery.sql
CREATE TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:54: NOTICE:  column "category" of relation "dsh_stores" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:55: NOTICE:  column "delivery_modes" of relation "dsh_stores" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:56: NOTICE:  column "is_free_delivery" of relation "dsh_stores" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:57: NOTICE:  column "distance_km" of relation "dsh_stores" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:58: NOTICE:  column "follower_count" of relation "dsh_stores" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:59: NOTICE:  column "has_pro_badge" of relation "dsh_stores" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:60: NOTICE:  column "has_coupon_badge" of relation "dsh_stores" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:61: NOTICE:  column "points_multiplier" of relation "dsh_stores" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-001_store_discovery.sql:62: NOTICE:  column "is_popular" of relation "dsh_stores" already exists, skipping
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
ALTER TABLE
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-001b_store_governance.sql
ALTER TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-002_home_discovery.sql
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-002b_storefront_catalog.sql
ALTER TABLE
psql:services/dsh/database/migrations/dsh-002b_storefront_catalog.sql:9: NOTICE:  constraint "dsh_stores_partner_readiness_chk" of relation "dsh_stores" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-002b_storefront_catalog.sql:12: NOTICE:  constraint "dsh_stores_catalog_approval_chk" of relation "dsh_stores" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-002b_storefront_catalog.sql:15: NOTICE:  constraint "dsh_stores_marketing_visibility_chk" of relation "dsh_stores" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-004_cart.sql
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-005_checkout_intent.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-006_orders.sql
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-007_dispatch.sql
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-008_field_onboarding.sql
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-009_support.sql
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-011_notifications.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE TABLE
exit_code=0

### services/dsh/database/migrations/dsh-012_marketing.sql
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE TABLE
exit_code=0

### services/dsh/database/migrations/dsh-013_platform_policies.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE TABLE
exit_code=0

### services/dsh/database/migrations/dsh-014_administration.sql
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-015_partner_lifecycle.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-016_field_partner_store_draft.sql
ALTER TABLE
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-017_marketing_governance.sql
ALTER TABLE
psql:services/dsh/database/migrations/dsh-017_marketing_governance.sql:17: NOTICE:  constraint "dsh_marketing_campaigns_target_type_chk" of relation "dsh_marketing_campaigns" does not exist, skipping
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-017_marketing_governance.sql:34: NOTICE:  constraint "dsh_marketing_banners_target_type_chk" of relation "dsh_marketing_banners" does not exist, skipping
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-017_marketing_governance.sql:51: NOTICE:  constraint "dsh_marketing_promos_target_type_chk" of relation "dsh_marketing_promos" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-018_retire_marketing_banners_promos.sql
DROP TABLE
DROP TABLE
exit_code=0

### services/dsh/database/migrations/dsh-019_marketing_tickers.sql
CREATE TABLE
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-020_partner_offers.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-021_checkout_payment_confirmation.sql
ALTER TABLE
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-022_catalog_cart_pricing.sql
ALTER TABLE
psql:services/dsh/database/migrations/dsh-022_catalog_cart_pricing.sql:17: NOTICE:  constraint "dsh_catalog_products_unit_price_chk" of relation "dsh_catalog_products" does not exist, skipping
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-022_catalog_cart_pricing.sql:26: NOTICE:  constraint "dsh_cart_items_unit_price_chk" of relation "dsh_cart_items" does not exist, skipping
ALTER TABLE
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-023_catalog_approval_queue.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-024_wlt_delivery_outbox.sql
CREATE TABLE
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-025_marketing_entity_type_constraints.sql
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-026_media_refs.sql
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-027_media_refs_provider_owned.sql
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-027_partner_bank_account.sql
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-028_store_onboarding_fee_policy.sql
CREATE TABLE
INSERT 0 1
exit_code=0

### services/dsh/database/migrations/dsh-029_field_work_queue_index.sql
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-030_central_catalog_sovereignty.sql
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
INSERT 0 1
INSERT 0 11
INSERT 0 14
INSERT 0 4
INSERT 0 3
INSERT 0 5
INSERT 0 3
exit_code=0

### services/dsh/database/migrations/dsh-031_product_proposal_review_pipeline.sql
DO
UPDATE 0
UPDATE 0
UPDATE 0
UPDATE 0
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-032_catalog_pim_dam_attributes_bulk_closure.sql
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
INSERT 0 4
exit_code=0

### services/dsh/database/migrations/dsh-033_cart_master_product_linkage.sql
ALTER TABLE
UPDATE 0
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-034_field_visit_integrity.sql
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-035_field_verification_snapshots.sql
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-036_central_catalog_runtime_closure.sql
BEGIN
CREATE TABLE
CREATE INDEX
INSERT 0 1
ALTER TABLE
DO
ALTER TABLE
ALTER TABLE
CREATE INDEX
DO
UPDATE 0
UPDATE 0
ALTER TABLE
ALTER TABLE
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-037_store_media_dam.sql
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-038_catalog_media_integrity.sql
BEGIN
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
DO
DROP INDEX
CREATE INDEX
INSERT 0 0
INSERT 0 0
INSERT 0 0
INSERT 0 0
INSERT 0 0
INSERT 0 0
INSERT 0 0
INSERT 0 0
INSERT 0 0
INSERT 0 0
DO
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-039_dispatch_captain_location.sql
ALTER TABLE
psql:services/dsh/database/migrations/dsh-039_dispatch_captain_location.sql:16: NOTICE:  constraint "dsh_assignments_last_latitude_check" of relation "dsh_assignments" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-039_dispatch_captain_location.sql:20: NOTICE:  constraint "dsh_assignments_last_longitude_check" of relation "dsh_assignments" does not exist, skipping
ALTER TABLE
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-040_payout_destination_ref.sql
ALTER TABLE
UPDATE 0
exit_code=0

### services/dsh/database/migrations/dsh-041_catalog_domain_strict_constraints.sql
CREATE TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-041_catalog_domain_strict_constraints.sql:68: NOTICE:  trigger "trigger_enforce_node_domain" for relation "dsh_catalog_nodes" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
psql:services/dsh/database/migrations/dsh-041_catalog_domain_strict_constraints.sql:73: NOTICE:  trigger "trigger_enforce_product_domain" for relation "dsh_master_products" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
psql:services/dsh/database/migrations/dsh-041_catalog_domain_strict_constraints.sql:78: NOTICE:  trigger "trigger_enforce_assortment_domain" for relation "dsh_store_assortments" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-041_catalog_domain_strict_constraints.sql:99: NOTICE:  trigger "trigger_no_node_cycles" for relation "dsh_catalog_nodes" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
exit_code=0

### services/dsh/database/migrations/dsh-042_catalog_domain_fixes.sql
UPDATE 0
UPDATE 0
UPDATE 0
ALTER TABLE
INSERT 0 0
DELETE 0
exit_code=0

### services/dsh/database/migrations/dsh-043_catalog_domain_fixes_v2.sql
ALTER TABLE
DELETE 0
INSERT 0 0
UPDATE 0
UPDATE 0
UPDATE 0
exit_code=0

### services/dsh/database/migrations/dsh-044_catalog_concurrency_and_backfill.sql
ALTER TABLE
INSERT 0 0
UPDATE 0
UPDATE 0
UPDATE 0
psql:services/dsh/database/migrations/dsh-044_catalog_concurrency_and_backfill.sql:37: NOTICE:  relation "uq_dsh_master_products_barcode" already exists, skipping
CREATE INDEX
psql:services/dsh/database/migrations/dsh-044_catalog_concurrency_and_backfill.sql:38: NOTICE:  relation "uq_dsh_master_products_gtin" already exists, skipping
CREATE INDEX
psql:services/dsh/database/migrations/dsh-044_catalog_concurrency_and_backfill.sql:39: NOTICE:  relation "uq_dsh_master_products_sku" already exists, skipping
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-045_occ_version_columns.sql
ALTER TABLE
psql:services/dsh/database/migrations/dsh-045_occ_version_columns.sql:5: NOTICE:  column "version" of relation "dsh_catalog_nodes" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-045_occ_version_columns.sql:6: NOTICE:  column "version" of relation "dsh_master_products" already exists, skipping
ALTER TABLE
psql:services/dsh/database/migrations/dsh-045_occ_version_columns.sql:7: NOTICE:  column "version" of relation "dsh_store_assortments" already exists, skipping
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-046_field_visit_gps.sql
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-047_field_commission_outbox.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-048_checkout_financial_closure_outbox.sql
CREATE TABLE
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-049_fulfillment_mode.sql
ALTER TABLE
UPDATE 0
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-050_partner_team_courier_coverage.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-051_team_identity.sql
ALTER TABLE
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-052_catalog_asset_link_version.sql
ALTER TABLE
exit_code=0

### services/dsh/database/migrations/dsh-053_special_requests.sql
BEGIN
DO
DO
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
UPDATE 1
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-054_special_requests_closure.sql
BEGIN
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-054_special_requests_closure.sql:22: NOTICE:  constraint "chk_special_request_stage" of relation "dsh_special_requests" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-054_special_requests_closure.sql:36: NOTICE:  constraint "chk_special_request_estimated_amount" of relation "dsh_special_requests" does not exist, skipping
ALTER TABLE
ALTER TABLE
UPDATE 0
UPDATE 0
CREATE INDEX
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-054_special_requests_closure.sql:91: NOTICE:  constraint "chk_assignment_source" of relation "dsh_assignments" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-054_special_requests_closure.sql:96: NOTICE:  constraint "chk_delivery_source" of relation "dsh_deliveries" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
DO
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-055_operational_closure.sql
BEGIN
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE INDEX
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-056_special_requests_tenancy.sql
BEGIN
ALTER TABLE
DROP INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-057_partner_delivery_pickup_closure.sql
BEGIN
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-058_partner_commercial_programs.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
COMMENT
COMMENT
exit_code=0

### services/dsh/database/migrations/dsh-058_unified_constraints.sql
BEGIN
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-058_unified_constraints.sql:22: NOTICE:  trigger "trg_check_assignment_mode" for relation "dsh_assignments" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
psql:services/dsh/database/migrations/dsh-058_unified_constraints.sql:28: NOTICE:  trigger "trg_check_delivery_mode" for relation "dsh_deliveries" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-059_partner_courier_connection_codes.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-059_special_request_dispatch_stage_sync.sql
BEGIN
CREATE FUNCTION
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-059_special_request_dispatch_stage_sync.sql:56: NOTICE:  trigger "trg_dsh_sync_special_request_dispatch_stage" for relation "dsh_special_requests" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
UPDATE 0
COMMIT
exit_code=0

### services/dsh/database/migrations/dsh-060_home_marketing_publication_gates.sql
ALTER TABLE
ALTER TABLE
UPDATE 0
UPDATE 0
psql:services/dsh/database/migrations/dsh-060_home_marketing_publication_gates.sql:44: NOTICE:  constraint "dsh_home_banners_publish_window_chk" of relation "dsh_home_banners" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-060_home_marketing_publication_gates.sql:50: NOTICE:  constraint "dsh_home_promos_publish_window_chk" of relation "dsh_home_promos" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
COMMENT
COMMENT
exit_code=0

### services/dsh/database/migrations/dsh-061_coupon_fail_closed_until_checkout_engine.sql
UPDATE 0
psql:services/dsh/database/migrations/dsh-061_coupon_fail_closed_until_checkout_engine.sql:24: NOTICE:  constraint "dsh_partner_offers_coupon_publish_requires_engine_chk" of relation "dsh_partner_offers" does not exist, skipping
ALTER TABLE
ALTER TABLE
UPDATE 0
psql:services/dsh/database/migrations/dsh-061_coupon_fail_closed_until_checkout_engine.sql:35: NOTICE:  constraint "dsh_stores_coupon_badge_requires_engine_chk" of relation "dsh_stores" does not exist, skipping
ALTER TABLE
ALTER TABLE
COMMENT
COMMENT
exit_code=0

### services/dsh/database/migrations/dsh-062_checkout_coupon_pricing_engine.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
ALTER TABLE
psql:services/dsh/database/migrations/dsh-062_checkout_coupon_pricing_engine.sql:102: NOTICE:  constraint "dsh_checkout_intents_pricing_totals_chk" of relation "dsh_checkout_intents" does not exist, skipping
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-062_checkout_coupon_pricing_engine.sql:118: NOTICE:  constraint "dsh_orders_pricing_totals_chk" of relation "dsh_orders" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-062_checkout_coupon_pricing_engine.sql:171: NOTICE:  trigger "trg_dsh_apply_checkout_pricing_to_order" for relation "dsh_orders" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-062_checkout_coupon_pricing_engine.sql:193: NOTICE:  trigger "trg_dsh_protect_order_pricing_snapshot" for relation "dsh_orders" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-062_checkout_coupon_pricing_engine.sql:239: NOTICE:  trigger "trg_dsh_validate_published_coupon_offer" for relation "dsh_partner_offers" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-062_checkout_coupon_pricing_engine.sql:288: NOTICE:  trigger "trg_dsh_sync_store_coupon_badge" for relation "dsh_partner_offers" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
COMMENT
COMMENT
COMMENT
exit_code=0

### services/dsh/database/migrations/dsh-063_marketing_commercial_program_guards.sql
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-063_marketing_commercial_program_guards.sql:46: NOTICE:  trigger "trg_dsh_guard_loyalty_tier_governance" for relation "dsh_loyalty_tiers" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-063_marketing_commercial_program_guards.sql:99: NOTICE:  trigger "trg_dsh_guard_subscription_plan_governance" for relation "dsh_subscription_plans" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
exit_code=0

### services/dsh/database/migrations/dsh-064_subscription_wlt_reference_uniqueness.sql
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-065_store_delivery_pricing.sql
CREATE TABLE
INSERT 0 0
INSERT 0 0
INSERT 0 0
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-065_store_delivery_pricing.sql:74: NOTICE:  constraint "dsh_coupon_redemptions_pricing_totals_chk" of relation "dsh_coupon_redemptions" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE FUNCTION
CREATE FUNCTION
CREATE INDEX
COMMENT
exit_code=0

### services/dsh/database/migrations/dsh-066_subscription_purchases.sql
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-066_subscription_purchases.sql:56: NOTICE:  trigger "trg_dsh_guard_subscription_purchase_update" for relation "dsh_subscription_purchases" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
exit_code=0

### services/dsh/database/migrations/dsh-067_loyalty_outbox_and_policy.sql
CREATE TABLE
CREATE INDEX
INSERT 0 1
ALTER TABLE
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-067_loyalty_outbox_and_policy.sql:96: NOTICE:  trigger "trg_dsh_enqueue_loyalty_earned" for relation "dsh_orders" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
CREATE INDEX
COMMENT
exit_code=0

### services/dsh/database/migrations/dsh-068_coupon_funding_policy.sql
ALTER TABLE
psql:services/dsh/database/migrations/dsh-068_coupon_funding_policy.sql:16: NOTICE:  constraint "dsh_coupons_funding_policy_chk" of relation "dsh_coupons" does not exist, skipping
ALTER TABLE
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-068_coupon_funding_policy.sql:44: NOTICE:  constraint "dsh_coupon_redemptions_funding_split_chk" of relation "dsh_coupon_redemptions" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-068_coupon_funding_policy.sql:52: NOTICE:  constraint "dsh_coupon_redemptions_partner_funding_chk" of relation "dsh_coupon_redemptions" does not exist, skipping
ALTER TABLE
ALTER TABLE
psql:services/dsh/database/migrations/dsh-068_coupon_funding_policy.sql:61: NOTICE:  constraint "dsh_coupon_redemptions_wlt_reference_chk" of relation "dsh_coupon_redemptions" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-068_coupon_funding_policy.sql:129: NOTICE:  trigger "trg_dsh_guard_coupon_funding_projection" for relation "dsh_coupon_redemptions" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
exit_code=0

### services/dsh/database/migrations/dsh-069_promotion_funding_outbox.sql
psql:services/dsh/database/migrations/dsh-069_promotion_funding_outbox.sql:6: NOTICE:  extension "pgcrypto" already exists, skipping
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
exit_code=0

### services/dsh/database/migrations/dsh-070_refund_commercial_reversal.sql
CREATE TABLE
psql:services/dsh/database/migrations/dsh-070_refund_commercial_reversal.sql:19: NOTICE:  column "funding_reversal_queued" of relation "dsh_order_refund_effects" already exists, skipping
ALTER TABLE
CREATE FUNCTION
COMMENT
exit_code=0

### services/dsh/database/migrations/dsh-071_loyalty_refund_race_closure.sql
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE FUNCTION
COMMENT
exit_code=0

### services/dsh/database/migrations/dsh-072_coupon_funding_transition_triggers.sql
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-072_coupon_funding_transition_triggers.sql:46: NOTICE:  trigger "trg_dsh_coupon_funding_release_on_checkout_cancel" for relation "dsh_checkout_intents" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-072_coupon_funding_transition_triggers.sql:91: NOTICE:  trigger "trg_dsh_coupon_funding_reverse_on_order_cancel" for relation "dsh_orders" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
exit_code=0

### services/dsh/database/migrations/dsh-073_checkout_tenant_lock.sql
ALTER TABLE
UPDATE 0
psql:services/dsh/database/migrations/dsh-073_checkout_tenant_lock.sql:23: NOTICE:  constraint "dsh_checkout_intents_tenant_id_chk" of relation "dsh_checkout_intents" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-073_checkout_tenant_lock.sql:59: NOTICE:  trigger "trg_dsh_guard_checkout_tenant" for relation "dsh_checkout_intents" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
ALTER TABLE
UPDATE 0
psql:services/dsh/database/migrations/dsh-073_checkout_tenant_lock.sql:75: NOTICE:  constraint "dsh_orders_tenant_id_chk" of relation "dsh_orders" does not exist, skipping
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-073_checkout_tenant_lock.sql:115: NOTICE:  trigger "trg_dsh_assign_order_tenant" for relation "dsh_orders" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
exit_code=0

### services/dsh/database/migrations/dsh-074_delivery_pricing_governance.sql
CREATE TABLE
CREATE INDEX
CREATE FUNCTION
psql:services/dsh/database/migrations/dsh-074_delivery_pricing_governance.sql:37: NOTICE:  trigger "trg_dsh_protect_pickup_fee" for relation "dsh_store_delivery_pricing" does not exist, skipping
DROP TRIGGER
CREATE TRIGGER
exit_code=0
migration_suite_exit_code=0

## Go format
services/wlt/backend/internal/promotionfunding/promotion_funding_test.go

exit_code=1

## DSH Go tests
go: downloading github.com/lib/pq v1.12.3
go: downloading github.com/google/uuid v1.6.0
go: downloading golang.org/x/image v0.44.0
go: downloading github.com/minio/minio-go/v7 v7.2.1
go: downloading github.com/cespare/xxhash/v2 v2.3.0
go: downloading github.com/dustin/go-humanize v1.0.1
go: downloading github.com/klauspost/compress v1.18.6
go: downloading github.com/klauspost/crc32 v1.3.0
go: downloading github.com/minio/crc64nvme v1.1.1
go: downloading github.com/minio/md5-simd v1.1.2
go: downloading gopkg.in/ini.v1 v1.67.2
go: downloading github.com/zeebo/xxh3 v1.1.0
go: downloading go.yaml.in/yaml/v3 v3.0.4
go: downloading golang.org/x/net v0.53.0
go: downloading github.com/klauspost/cpuid/v2 v2.2.11
go: downloading golang.org/x/sys v0.44.0
go: downloading golang.org/x/crypto v0.51.0
go: downloading github.com/rs/xid v1.6.0
go: downloading github.com/tinylib/msgp v1.6.1
go: downloading github.com/philhofer/fwd v1.2.0
go: downloading golang.org/x/text v0.40.0
?   	dsh-api/cmd/dsh-api	[no test files]
ok  	dsh-api/internal/administration	0.004s
ok  	dsh-api/internal/analytics	0.003s
ok  	dsh-api/internal/auth	0.007s
ok  	dsh-api/internal/cart	0.004s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.005s
ok  	dsh-api/internal/checkout	0.005s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.004s
ok  	dsh-api/internal/coupons	0.004s
ok  	dsh-api/internal/dispatch	0.009s
ok  	dsh-api/internal/fieldcommissionoutbox	0.008s
ok  	dsh-api/internal/fieldreadiness	0.005s
ok  	dsh-api/internal/health	0.007s
ok  	dsh-api/internal/homediscovery	0.005s
--- FAIL: TestCatalogContractMatchesRuntimeOCCSurface (0.01s)
    catalog_contract_alignment_test.go:96: schema UpdateDomainRequest: must require expectedVersion
FAIL
FAIL	dsh-api/internal/http	0.087s
ok  	dsh-api/internal/marketing	0.013s
ok  	dsh-api/internal/media	0.006s
ok  	dsh-api/internal/notifications	0.003s
ok  	dsh-api/internal/operationaloutbox	0.003s
ok  	dsh-api/internal/orders	0.004s
ok  	dsh-api/internal/partner	0.005s
ok  	dsh-api/internal/partnerdelivery	0.007s
ok  	dsh-api/internal/partnerfleet	0.003s
ok  	dsh-api/internal/pickup	0.004s
ok  	dsh-api/internal/platformpolicies	0.002s
?   	dsh-api/internal/promotionfundingoutbox	[no test files]
ok  	dsh-api/internal/specialrequests	0.006s
ok  	dsh-api/internal/store	0.014s
ok  	dsh-api/internal/support	0.003s
ok  	dsh-api/internal/wlt	0.011s
ok  	dsh-api/internal/wltoutbox	0.003s
FAIL

exit_code=1

## WLT Go tests
go: downloading go1.26.5 (linux/amd64)
?   	wlt-api/cmd/wlt-api	[no test files]
ok  	wlt-api/internal/cod	0.013s
ok  	wlt-api/internal/commercial	0.012s
ok  	wlt-api/internal/dshnotify	0.017s
?   	wlt-api/internal/dshoutbox	[no test files]
?   	wlt-api/internal/health	[no test files]
ok  	wlt-api/internal/http	0.026s
ok  	wlt-api/internal/ledger	0.011s
ok  	wlt-api/internal/payment	0.013s
ok  	wlt-api/internal/payout	0.010s
ok  	wlt-api/internal/promotionfunding	0.007s
ok  	wlt-api/internal/provider	0.005s
ok  	wlt-api/internal/reconciliation	0.006s
ok  	wlt-api/internal/reference	0.005s
ok  	wlt-api/internal/refund	0.007s
ok  	wlt-api/internal/settlement	0.005s
?   	wlt-api/internal/shared	[no test files]
?   	wlt-api/internal/wallet	[no test files]

exit_code=0

## Workspace install
Scope: all 24 workspace projects
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +1252
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 1252, reused 1251, downloaded 0, added 45
Progress: resolved 1252, reused 1251, downloaded 0, added 641
Progress: resolved 1252, reused 1251, downloaded 0, added 1252, done

dependencies:
+ @react-native-async-storage/async-storage 2.2.0
+ @react-native-community/netinfo 12.0.1
+ expo-linking 57.0.3

devDependencies:
+ @ast-grep/cli 0.43.0
+ @ls-lint/ls-lint 2.3.1
+ @opentelemetry/api 1.9.1
+ @opentelemetry/exporter-trace-otlp-http 0.217.0
+ @opentelemetry/resources 1.30.1
+ @opentelemetry/sdk-node 0.217.0
+ @opentelemetry/semantic-conventions 1.41.1
+ @stoplight/spectral-cli 6.16.0
+ @types/react 19.2.17
+ ajv 8.20.0
+ ajv-formats 3.0.1
+ autocannon 8.0.0
+ babel-plugin-react-compiler 1.0.0
+ dependency-cruiser 17.4.3
+ eslint 9.39.1
+ eslint-plugin-react-compiler 19.1.0-rc.2
+ jscpd 5.0.10
+ knip 6.17.1
+ madge 8.0.0
+ markdownlint-cli2 0.23.0
+ nx 22.3.3
+ openapi-typescript 7.13.0
+ sherif 1.11.1
+ size-limit 11.2.0
+ typescript 6.0.3

Done in 3.8s using pnpm v10.34.2

exit_code=0

## Contract lint

> bthwani-suite-next@0.0.0 contracts:lint /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/important-scripts/contracts-foundation.mjs

contracts-foundation: PASS

exit_code=0

## Backend API binding

> bthwani-suite-next@0.0.0 guard:backend-api-binding /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/backend-api-binding-gate.mjs

backend-api-binding-gate: FAIL
- services/dsh/backend/internal/http/server.go:33 FORBIDDEN_ROUTE: Route "GET /dsh/operator/stores/{storeId}/delivery-pricing" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:34 FORBIDDEN_ROUTE: Route "PUT /dsh/operator/stores/{storeId}/delivery-pricing/{fulfillmentMode}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:43 FORBIDDEN_ROUTE: Route "GET /dsh/partner/stores/{storeId}/delivery-pricing" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:44 FORBIDDEN_ROUTE: Route "PUT /dsh/partner/stores/{storeId}/delivery-pricing/{fulfillmentMode}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:169 FORBIDDEN_ROUTE: Route "POST /dsh/client/support/tickets" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:170 FORBIDDEN_ROUTE: Route "GET /dsh/client/support/tickets" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:171 FORBIDDEN_ROUTE: Route "GET /dsh/client/support/tickets/{ticketId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:172 FORBIDDEN_ROUTE: Route "POST /dsh/client/support/tickets/{ticketId}/messages" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:174 FORBIDDEN_ROUTE: Route "GET /dsh/operator/support/tickets/{ticketId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:176 FORBIDDEN_ROUTE: Route "POST /dsh/operator/support/tickets/{ticketId}/messages" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:177 FORBIDDEN_ROUTE: Route "POST /dsh/operator/support/tickets/{ticketId}/escalate" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:178 FORBIDDEN_ROUTE: Route "GET /dsh/operator/escalations" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:179 FORBIDDEN_ROUTE: Route "POST /dsh/operator/escalations/{escalationId}/resolve" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:182 FORBIDDEN_ROUTE: Route "GET /dsh/operator/analytics/operations" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:206 FORBIDDEN_ROUTE: Route "GET /dsh/operator/marketing/loyalty-earning-policies" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:207 FORBIDDEN_ROUTE: Route "POST /dsh/operator/marketing/loyalty-earning-policies" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:208 FORBIDDEN_ROUTE: Route "PATCH /dsh/operator/marketing/loyalty-earning-policies/{policyId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:217 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/domains" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:218 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/domains" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:219 FORBIDDEN_ROUTE: Route "PATCH /dsh/catalog/domains/{domainId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:220 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/nodes" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:221 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/nodes" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:222 FORBIDDEN_ROUTE: Route "PATCH /dsh/catalog/nodes/{nodeId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:223 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/master-products" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:224 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/master-products" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:225 FORBIDDEN_ROUTE: Route "PATCH /dsh/catalog/master-products/{productId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:226 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/proposals" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:227 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/proposals/{proposalId}/decision" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:228 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/proposals/{proposalId}/transitions" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:229 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/policies" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:230 FORBIDDEN_ROUTE: Route "PATCH /dsh/catalog/policies/{policyId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:231 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/stores/{storeId}/assortment" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:232 FORBIDDEN_ROUTE: Route "PUT /dsh/catalog/stores/{storeId}/assortment/{masterProductId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:233 FORBIDDEN_ROUTE: Route "GET /dsh/field/catalog/domains" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:234 FORBIDDEN_ROUTE: Route "GET /dsh/field/catalog/nodes" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:236 FORBIDDEN_ROUTE: Route "GET /dsh/field/catalog/stores/{storeId}/assortment" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:237 FORBIDDEN_ROUTE: Route "PUT /dsh/field/catalog/stores/{storeId}/assortment/{masterProductId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:238 FORBIDDEN_ROUTE: Route "GET /dsh/partner/catalog/domains" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:239 FORBIDDEN_ROUTE: Route "GET /dsh/partner/catalog/nodes" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:241 FORBIDDEN_ROUTE: Route "POST /dsh/partner/catalog/proposals" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:242 FORBIDDEN_ROUTE: Route "GET /dsh/partner/catalog/proposals" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:243 FORBIDDEN_ROUTE: Route "GET /dsh/partner/catalog/assortment" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:244 FORBIDDEN_ROUTE: Route "PUT /dsh/partner/catalog/assortment/{masterProductId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/contracts/dsh.openapi.yaml:19 MISSING_IMPLEMENTATION: Route "GET /dsh/field/me/finance/wallet" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:51 MISSING_IMPLEMENTATION: Route "GET /dsh/field/me/finance/commissions" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:86 MISSING_IMPLEMENTATION: Route "GET /dsh/field/me/finance/ledger-entries" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:104 MISSING_IMPLEMENTATION: Route "GET /dsh/field/me/finance/payout-requests" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:133 MISSING_IMPLEMENTATION: Route "POST /dsh/field/me/finance/payout-requests" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:325 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/workforce/media/uploads" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:893 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/domains" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:899 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/domains" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:907 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/domains/{domainId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:937 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/nodes" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:950 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/nodes" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:958 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/nodes/{nodeId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:986 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/master-products" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1034 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/master-products" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1042 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/master-products/{productId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1073 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/product-proposals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1099 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/product-proposals/{proposalId}/decision" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1112 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/product-proposals/{proposalId}/transition" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1125 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/platform-policies" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1133 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/platform-policies/{policyId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1166 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/platform-policies/{policyId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1199 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/seed-status" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1208 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/assets" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1234 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/assets/upload-intents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1281 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/assets/{assetId}/complete" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1295 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/assets/{assetId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1321 MISSING_IMPLEMENTATION: Route "DELETE /dsh/operator/catalog/assets/{assetId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1335 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/assets/{assetId}/review" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1371 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/assets/{assetId}/link" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1385 MISSING_IMPLEMENTATION: Route "DELETE /dsh/operator/catalog/assets/{assetId}/links/{linkId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1411 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/reels" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1441 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/reels/{reelId}/review" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1474 MISSING_IMPLEMENTATION: Route "POST /dsh/partner/reels" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1525 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/asset-links" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1543 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/domains/{domainId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1561 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/nodes/{nodeId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1579 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/master-products/{productId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1597 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/product-proposals/{proposalId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1615 MISSING_IMPLEMENTATION: Route "PUT /dsh/stores/{storeId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1645 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/stores/{storeId}/assortment" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1654 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/stores/{storeId}/assortment/{masterProductId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1669 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/catalog/taxonomy" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1685 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/stores/{storeId}/assortment" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1694 MISSING_IMPLEMENTATION: Route "PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1709 MISSING_IMPLEMENTATION: Route "POST /dsh/partner/catalog/product-proposals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1717 MISSING_IMPLEMENTATION: Route "PUT /dsh/partner/catalog/product-proposals/{proposalId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1730 MISSING_IMPLEMENTATION: Route "GET /dsh/field/catalog/taxonomy" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1746 MISSING_IMPLEMENTATION: Route "PUT /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1765 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/assortment" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1779 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/{partnerId}/catalog/product-proposals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1792 MISSING_IMPLEMENTATION: Route "PUT /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3230 MISSING_IMPLEMENTATION: Route "GET /dsh/catalog-approvals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3255 MISSING_IMPLEMENTATION: Route "POST /dsh/catalog-approvals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3275 MISSING_IMPLEMENTATION: Route "GET /dsh/catalog-approvals/{recordId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3295 MISSING_IMPLEMENTATION: Route "POST /dsh/catalog-approvals/{recordId}/transition" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3321 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/catalog-approvals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3336 MISSING_IMPLEMENTATION: Route "POST /dsh/field/stores/{storeId}/visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3357 MISSING_IMPLEMENTATION: Route "GET /dsh/field/stores/{storeId}/visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3374 MISSING_IMPLEMENTATION: Route "GET /dsh/field/work-queue" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3389 MISSING_IMPLEMENTATION: Route "POST /dsh/field/visits/{visitId}/complete" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3410 MISSING_IMPLEMENTATION: Route "PUT /dsh/field/visits/{visitId}/checks" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3434 MISSING_IMPLEMENTATION: Route "GET /dsh/field/visits/{visitId}/checks" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3454 MISSING_IMPLEMENTATION: Route "POST /dsh/field/stores/{storeId}/escalations" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3477 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/field-readiness/escalations" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3499 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/field-readiness/escalations/{escalationId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3525 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/stores/{storeId}/onboarding-status" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3544 MISSING_IMPLEMENTATION: Route "POST /dsh/support/tickets" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3563 MISSING_IMPLEMENTATION: Route "GET /dsh/support/tickets" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3578 MISSING_IMPLEMENTATION: Route "GET /dsh/support/tickets/{ticketId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3599 MISSING_IMPLEMENTATION: Route "POST /dsh/support/tickets/{ticketId}/messages" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3623 MISSING_IMPLEMENTATION: Route "GET /dsh/support/tickets/{ticketId}/messages" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3691 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/incidents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3710 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/incidents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3732 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/incidents/{incidentId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3759 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/analytics/platform" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3774 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/analytics/orders" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3793 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/analytics/delivery" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3831 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/analytics/stores" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3846 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/analytics/performance" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3901 MISSING_IMPLEMENTATION: Route "GET /dsh/notifications" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3916 MISSING_IMPLEMENTATION: Route "POST /dsh/notifications/{notificationId}/read" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3937 MISSING_IMPLEMENTATION: Route "POST /dsh/notifications/read-all" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3956 MISSING_IMPLEMENTATION: Route "PUT /dsh/notifications/preferences" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3977 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/notifications/config" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3990 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/notifications/config" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4314 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/zones" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4327 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/platform/zones" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4348 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/platform/zones/{zoneId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4375 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/sla-rules" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4394 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/platform/sla-rules" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4415 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/capacity" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4434 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/platform/capacity" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4455 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/serviceability/{zoneId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4476 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/store-onboarding-fee" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4490 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/platform/store-onboarding-fee" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4511 MISSING_IMPLEMENTATION: Route "GET /dsh/platform/store-onboarding-fee" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4528 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/roles" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4541 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/roles" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4562 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/staff" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4577 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/staff/{staffId}/roles" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4606 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4633 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/partners" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4655 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4676 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/partners/{partnerId}/transition" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4709 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/readiness" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4730 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/documents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4749 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/partners/{partnerId}/documents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4775 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/partners/{partnerId}/documents/{docId}/review" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4806 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/stores" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4825 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/partners/{partnerId}/stores" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4852 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/audit" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4873 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/field-visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4900 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/activation/status" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4916 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/activation/readiness" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5127 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5153 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/drafts" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5175 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5194 MISSING_IMPLEMENTATION: Route "PATCH /dsh/field/partners/{partnerId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5221 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/readiness" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5243 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/store" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5268 MISSING_IMPLEMENTATION: Route "PATCH /dsh/field/partners/{partnerId}/store" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5301 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/documents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5326 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/{partnerId}/documents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5408 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/{partnerId}/visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5434 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/field-visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5461 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/{partnerId}/submit" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5497 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/partners" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5512 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/partners/{partnerId}/activate" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5539 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/partners/{partnerId}/block" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5566 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/captains" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5581 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/captains/{captainId}/credential" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5608 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/audit" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/wlt/backend/internal/http/server.go:110 FORBIDDEN_ROUTE: Route "POST /wlt/promotion-funding/reservations" is registered in Go router but not documented exactly in composed contracts: services/wlt/contracts/wlt.openapi.yaml, services/wlt/contracts/wlt.commercial.openapi.yaml, services/wlt/contracts/wlt.commercial-summary.openapi.yaml
- services/wlt/backend/internal/http/server.go:111 FORBIDDEN_ROUTE: Route "GET /wlt/promotion-funding/reservations/{reservationId}" is registered in Go router but not documented exactly in composed contracts: services/wlt/contracts/wlt.openapi.yaml, services/wlt/contracts/wlt.commercial.openapi.yaml, services/wlt/contracts/wlt.commercial-summary.openapi.yaml
- services/wlt/backend/internal/http/server.go:112 FORBIDDEN_ROUTE: Route "POST /wlt/promotion-funding/reservations/{reservationId}/commit" is registered in Go router but not documented exactly in composed contracts: services/wlt/contracts/wlt.openapi.yaml, services/wlt/contracts/wlt.commercial.openapi.yaml, services/wlt/contracts/wlt.commercial-summary.openapi.yaml
- services/wlt/backend/internal/http/server.go:113 FORBIDDEN_ROUTE: Route "POST /wlt/promotion-funding/reservations/{reservationId}/release" is registered in Go router but not documented exactly in composed contracts: services/wlt/contracts/wlt.openapi.yaml, services/wlt/contracts/wlt.commercial.openapi.yaml, services/wlt/contracts/wlt.commercial-summary.openapi.yaml
- services/wlt/backend/internal/http/server.go:114 FORBIDDEN_ROUTE: Route "POST /wlt/promotion-funding/reservations/{reservationId}/reverse" is registered in Go router but not documented exactly in composed contracts: services/wlt/contracts/wlt.openapi.yaml, services/wlt/contracts/wlt.commercial.openapi.yaml, services/wlt/contracts/wlt.commercial-summary.openapi.yaml
- services/wlt/contracts/wlt.openapi.yaml:949 MISSING_MUTATION_METADATA: POST /wlt/settlements must set x-bthwani-mutation-approved: false
- services/wlt/contracts/wlt.commercial.openapi.yaml:21 MISSING_MUTATION_METADATA: POST /wlt/commercial/products must set x-bthwani-mutation-approved: false
- services/wlt/contracts/wlt.commercial.openapi.yaml:42 MISSING_FINANCIAL_READ_HEADER: WLT financial read route "GET /wlt/commercial/products/{productReference}" is missing required header "Authorization"
- services/wlt/contracts/wlt.commercial.openapi.yaml:55 MISSING_MUTATION_METADATA: PATCH /wlt/commercial/products/{productReference} must set x-bthwani-mutation-approved: false
- services/wlt/contracts/wlt.commercial.openapi.yaml:78 MISSING_FINANCIAL_READ_HEADER: WLT financial read route "GET /wlt/commercial/clients/{clientId}/benefits" is missing required header "Authorization"
- services/wlt/contracts/wlt.commercial.openapi.yaml:95 MISSING_MUTATION_METADATA: POST /wlt/commercial/loyalty-entries must set x-bthwani-mutation-approved: false
- services/wlt/contracts/wlt.commercial.openapi.yaml:121 MISSING_MUTATION_METADATA: POST /wlt/commercial/subscriptions must set x-bthwani-mutation-approved: false
- services/dsh/backend/internal/wlt/commercial.go:204 FORBIDDEN_CROSS_SERVICE_CALL: Outbound request "GET /wlt/commercial/clients/" to WLT is not documented in its OpenAPI contract
 ELIFECYCLE  Command failed with exit code 1.

exit_code=1

## Frontend API binding

> bthwani-suite-next@0.0.0 guard:api-binding /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/api-binding-gate.mjs

api-binding-gate: FAIL
- services/dsh/frontend/shared/marketing/loyalty-policy.api.ts UNREGISTERED PATH: "/dsh/operator/marketing/loyalty-earning-policies" not found in master-indexed OpenAPI contracts
- services/dsh/frontend/shared/marketing/loyalty-policy.api.ts UNREGISTERED PATH: "/dsh/operator/marketing/loyalty-earning-policies" not found in master-indexed OpenAPI contracts
- services/dsh/frontend/shared/marketing/loyalty-policy.api.ts UNREGISTERED PATH: "/dsh/operator/marketing/loyalty-earning-policies/${policyId}" not found in master-indexed OpenAPI contracts
- services/dsh/frontend/shared/partner/partner-delivery-pricing.api.ts UNREGISTERED PATH: "/dsh/partner/stores/${storeId}/delivery-pricing" not found in master-indexed OpenAPI contracts
- services/dsh/frontend/shared/partner/partner-delivery-pricing.api.ts UNREGISTERED PATH: "/dsh/partner/stores/${storeId}/delivery-pricing/partner_delivery" not found in master-indexed OpenAPI contracts
 ELIFECYCLE  Command failed with exit code 1.

exit_code=1

## Feature binding

> bthwani-suite-next@0.0.0 guard:frontend-feature-binding /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/frontend-feature-binding-gate.mjs

frontend-feature-binding-gate: checked 25 STATIC_BINDING entries
frontend-feature-binding-gate: proves static dependency and contract reachability only; runtime requires same-commit runtime evidence
frontend-feature-binding-gate: FAIL
- services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx SCREEN_MISSING client.checkout
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING client.checkout -> dsh.client.checkout
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING client.orders-list -> dsh.client.orders
- services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE client.order-tracking -> services/dsh/frontend/shared/orders/orders.controller-core.ts
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING client.order-tracking -> dsh.client.orders
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.orders-inbox -> dsh.client.orders
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING partner.catalog-workspace -> GET /dsh/partner/catalog/taxonomy
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.catalog-workspace -> dsh.client.catalog
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING partner.product-proposal -> POST /dsh/partner/catalog/product-proposals
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.product-proposal -> dsh.client.catalog
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING partner.taxonomy-browse -> GET /dsh/partner/catalog/taxonomy
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.taxonomy-browse -> dsh.client.catalog
- services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE partner.store-settings -> services/dsh/frontend/shared/store/store-admin.controller-core.ts
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.store-settings -> dsh.store.discovery
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING captain.assignments -> dsh.client.dispatch
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING captain.delivery-map -> dsh.client.dispatch
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING captain.pickup-dropoff -> dsh.client.dispatch
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING captain.pod -> dsh.client.dispatch
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING field.partner-onboarding -> POST /dsh/field/partners/{partnerId}/submit
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING field.partner-onboarding -> dsh.field.readiness
- services/dsh/frontend/app-field/stores/DshFieldStoreVerificationScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE field.store-verification -> services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING field.store-verification -> dsh.field.readiness
- services/dsh/frontend/app-field/escalation/DshFieldVisitScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE field.media-upload -> services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING field.media-upload -> dsh.field.readiness
- services/dsh/frontend/app-field/stores/DshFieldStoresHistoryScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE field.visit-history -> services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING field.visit-history -> GET /dsh/field/stores/{storeId}/visits
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING field.visit-history -> dsh.field.readiness
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.operations-hub -> dsh.client.orders
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.live-orders -> dsh.client.orders
- services/dsh/frontend/control-panel/operations/CartActivityScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE control.cart-activity -> services/dsh/frontend/shared/operations/use-operations-controller.tsx
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.cart-activity -> dsh.client.cart
- services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE control.checkout-activity -> services/dsh/frontend/shared/operations/use-operations-controller.tsx
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.checkout-activity -> dsh.client.checkout
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING control.analytics -> GET /dsh/operator/analytics/platform
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.analytics -> dsh.operator.analytics
- services/dsh/frontend/control-panel/catalogs/CatalogApprovalScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE control.catalog-approvals -> services/dsh/frontend/shared/partner/use-partners-controller.tsx
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING control.catalog-approvals -> GET /dsh/catalog-approvals
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.catalog-approvals -> dsh.admin
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING control.partner-activation -> GET /dsh/operator/partners
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.partner-activation -> dsh.partner.activation
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.support-tickets -> dsh.support.hub
- services/dsh/frontend/control-panel/support/PlatformNotificationConfigScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE control.notification-config -> services/dsh/frontend/shared/support/use-support-controller.tsx
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING control.notification-config -> GET /dsh/operator/notifications/config
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.notification-config -> dsh.notifications
 ELIFECYCLE  Command failed with exit code 1.

exit_code=1

## Broken imports

> bthwani-suite-next@0.0.0 guard:no-broken-imports /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/no-broken-imports.mjs

no-broken-imports: PASS

exit_code=0

## Typecheck

> bthwani-suite-next@0.0.0 typecheck /home/runner/work/bthwani-suite-next/bthwani-suite-next
> pnpm -r --if-present typecheck

Scope: 23 of 24 workspace projects
contracts typecheck$ node ../tools/important-scripts/contracts-typecheck.mjs
core/identity typecheck$ tsc --noEmit -p tsconfig.json
core/platform-control typecheck$ tsc --noEmit -p tsconfig.json
core/providers typecheck$ tsc --noEmit -p tsconfig.json
contracts typecheck: contracts-foundation: PASS
core/providers typecheck: Done
core/workforce typecheck$ tsc --noEmit -p tsconfig.json
core/platform-control typecheck: Done
services/wlt typecheck$ tsc --noEmit -p tsconfig.json
core/identity typecheck: Done
shared/app-shell typecheck$ tsc --noEmit -p tsconfig.json
core/workforce typecheck: Done
shared/ui-kit typecheck$ tsc --noEmit -p tsconfig.json
shared/app-shell typecheck: Done
services/wlt typecheck: Done
contracts typecheck: /home/runner/work/bthwani-suite-next/bthwani-suite-next/contracts/master.openapi.yaml
contracts typecheck:  1:1  warning  oas3-api-servers  OpenAPI "servers" must be present and non-empty array.
contracts typecheck:  2:6  warning  info-contact      Info object must have "contact" object.                 info
contracts typecheck: /home/runner/work/bthwani-suite-next/bthwani-suite-next/core/identity/contracts/auth.openapi.yaml
contracts typecheck:    2:6   warning  info-contact           Info object must have "contact" object.                        info
contracts typecheck:   13:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./identity/health.get
contracts typecheck:   13:9   warning  operation-tags         Operation must have non-empty "tags" array.                    paths./identity/health.get
contracts typecheck:   23:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./identity/readiness.get
contracts typecheck:   23:9   warning  operation-tags         Operation must have non-empty "tags" array.                    paths./identity/readiness.get
contracts typecheck:   35:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/login.post
contracts typecheck:   35:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/login.post
contracts typecheck:   55:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/otp/request.post
contracts typecheck:   55:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/otp/request.post
contracts typecheck:   75:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/activate.post
contracts typecheck:   75:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/activate.post
contracts typecheck:   97:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/logout.post
contracts typecheck:   97:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/logout.post
contracts typecheck:  107:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/refresh.post
contracts typecheck:  107:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/refresh.post
contracts typecheck:   127:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/session.get
contracts typecheck:   127:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/session.get
contracts typecheck:  141:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/introspect.post
contracts typecheck:  141:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/introspect.post
contracts typecheck:   161:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/sessions.get
contracts typecheck:   161:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/sessions.get
contracts typecheck:  178:12  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/sessions/{sessionId}.delete
contracts typecheck:  178:12  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/sessions/{sessionId}.delete
contracts typecheck:  197:12  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/account.delete
contracts typecheck:  197:12  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/account.delete
contracts typecheck:  208:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./auth/password/change.post
contracts typecheck:  208:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./auth/password/change.post
contracts typecheck:  234:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./internal/actors/provision.post.tags[0]
contracts typecheck:  274:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./internal/actors/search.get.tags[0]
contracts typecheck:  305:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./internal/actors/{actorId}.get.tags[0]
contracts typecheck:  327:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./internal/actors/{actorId}/deactivate.post.tags[0]
contracts typecheck:  347:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./internal/actors/{actorId}/reactivate.post.tags[0]
contracts typecheck:  365:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./internal/actors/{actorId}/activations.post.tags[0]
contracts typecheck:  417:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./internal/actors/{actorId}/activations/latest.get.tags[0]
contracts typecheck:  439:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./internal/actors/{actorId}/activations/revoke.post.tags[0]
contracts typecheck: /home/runner/work/bthwani-suite-next/bthwani-suite-next/core/providers/contracts/providers.openapi.yaml
contracts typecheck:   1:1   warning  oas3-api-servers       OpenAPI "servers" must be present and non-empty array.
contracts typecheck:   2:6   warning  info-contact           Info object must have "contact" object.                        info
contracts typecheck:  18:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./providers/health.get.tags[0]
contracts typecheck:   28:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./providers.get
contracts typecheck:  32:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./providers.get.tags[0]
contracts typecheck:   44:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./providers/{providerId}.get
contracts typecheck:  48:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./providers/{providerId}.get.tags[0]
contracts typecheck:  64:11  warning  operation-description  Operation "description" must be present and non-empty string.  paths./providers/{providerId}.patch
contracts typecheck:  68:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./providers/{providerId}.patch.tags[0]
contracts typecheck: /home/runner/work/bthwani-suite-next/bthwani-suite-next/core/workforce/contracts/workforce.openapi.yaml
contracts typecheck:    2:6   warning  info-contact           Info object must have "contact" object.                        info
contracts typecheck:   19:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/health.get
contracts typecheck:   19:9   warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/health.get
contracts typecheck:   29:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/readiness.get
contracts typecheck:   29:9   warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/readiness.get
contracts typecheck:   41:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/field-agents.post
contracts typecheck:   92:9   warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/field-agents.get
contracts typecheck:   143:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/field-agents/{actorId}.get
contracts typecheck:  163:11  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/field-agents/{actorId}.patch
contracts typecheck:  205:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/field-agents/{actorId}/suspend.post
contracts typecheck:  244:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/field-agents/{actorId}/reactivate.post
contracts typecheck:  280:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/field-agents/{actorId}/activation-codes.post
contracts typecheck:  334:12  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/field-agents/{actorId}/activation-codes.delete
contracts typecheck:  352:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/captains.post
contracts typecheck:   387:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/captains.get
contracts typecheck:   437:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/captains/{actorId}.get
contracts typecheck:   437:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/captains/{actorId}.get
contracts typecheck:  456:11  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/captains/{actorId}.patch
contracts typecheck:  456:11  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/captains/{actorId}.patch
contracts typecheck:  487:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/captains/{actorId}/suspend.post
contracts typecheck:  487:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/captains/{actorId}/suspend.post
contracts typecheck:  516:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/captains/{actorId}/reactivate.post
contracts typecheck:  516:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/captains/{actorId}/reactivate.post
contracts typecheck:  545:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/captains/{actorId}/activation-codes.post
contracts typecheck:  545:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/captains/{actorId}/activation-codes.post
contracts typecheck:  580:12  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/captains/{actorId}/activation-codes.delete
contracts typecheck:  580:12  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/captains/{actorId}/activation-codes.delete
contracts typecheck:  597:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/employees.post
contracts typecheck:   632:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/employees.get
contracts typecheck:   682:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/employees/{actorId}.get
contracts typecheck:   682:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/employees/{actorId}.get
contracts typecheck:  701:11  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/employees/{actorId}.patch
contracts typecheck:  701:11  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/employees/{actorId}.patch
contracts typecheck:  732:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/employees/{actorId}/suspend.post
contracts typecheck:  732:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/employees/{actorId}/suspend.post
contracts typecheck:  761:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./workforce/employees/{actorId}/reactivate.post
contracts typecheck:  761:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/employees/{actorId}/reactivate.post
contracts typecheck:   790:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/me.get
contracts typecheck:  811:11  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/me.patch
contracts typecheck:   848:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/reference/cities.get
contracts typecheck:   872:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/reference/shifts.get
contracts typecheck:  895:10  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/reference/shifts.post
contracts typecheck:  926:11  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/reference/shifts/{code}.patch
contracts typecheck:   953:9  warning  operation-tags         Operation must have non-empty "tags" array.                    paths./workforce/reference/supervisors.get
contracts typecheck: /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/contracts/dsh.openapi.yaml
contracts typecheck:    1:1    warning  oas3-api-servers            OpenAPI "servers" must be present and non-empty array.
contracts typecheck:    2:6    warning  info-contact                Info object must have "contact" object.                        info
contracts typecheck:    19:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/me/finance/wallet.get
contracts typecheck:   23:11   warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/me/finance/wallet.get.tags[0]
contracts typecheck:    51:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/me/finance/commissions.get
contracts typecheck:   55:11   warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/me/finance/commissions.get.tags[0]
contracts typecheck:    86:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/me/finance/ledger-entries.get
contracts typecheck:   90:11   warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/me/finance/ledger-entries.get.tags[0]
contracts typecheck:   104:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/me/finance/payout-requests.get
contracts typecheck:   108:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/me/finance/payout-requests.get.tags[0]
contracts typecheck:   133:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/me/finance/payout-requests.post
contracts typecheck:   137:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/me/finance/payout-requests.post.tags[0]
contracts typecheck:   177:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/health.get
contracts typecheck:   181:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/health.get.tags[0]
contracts typecheck:   191:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/readiness.get
contracts typecheck:   195:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/readiness.get.tags[0]
contracts typecheck:   211:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/stores.get
contracts typecheck:   215:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/stores.get.tags[0]
contracts typecheck:   277:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/home-discovery.get
contracts typecheck:   281:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/home-discovery.get.tags[0]
contracts typecheck:   325:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/workforce/media/uploads.post
contracts typecheck:   329:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/workforce/media/uploads.post.tags[0]
contracts typecheck:   369:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/home-discovery/{kind}.get
contracts typecheck:   372:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/home-discovery/{kind}.get.tags[0]
contracts typecheck:   386:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/home-discovery/{kind}.post
contracts typecheck:   389:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/home-discovery/{kind}.post.tags[0]
contracts typecheck:   422:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/home-discovery/{kind}/{itemId}.patch
contracts typecheck:   425:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/home-discovery/{kind}/{itemId}.patch.tags[0]
contracts typecheck:   451:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/home-discovery/{kind}/{itemId}.delete
contracts typecheck:   454:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/home-discovery/{kind}/{itemId}.delete.tags[0]
contracts typecheck:   470:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/stores/{storeId}.get
contracts typecheck:   474:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/stores/{storeId}.get.tags[0]
contracts typecheck:   509:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/store-context.get
contracts typecheck:   512:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/store-context.get.tags[0]
contracts typecheck:   532:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/stores.get
contracts typecheck:   535:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/stores.get.tags[0]
contracts typecheck:   551:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/stores/{storeId}.get
contracts typecheck:   554:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/stores/{storeId}.get.tags[0]
contracts typecheck:   574:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/settings.get
contracts typecheck:   577:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/settings.get.tags[0]
contracts typecheck:   595:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/settings.patch
contracts typecheck:   598:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/settings.patch.tags[0]
contracts typecheck:   630:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/courier-settings.get
contracts typecheck:   633:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/courier-settings.get.tags[0]
contracts typecheck:   648:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/courier-settings.put
contracts typecheck:   651:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/courier-settings.put.tags[0]
contracts typecheck:   673:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/coverage-zones.get
contracts typecheck:   676:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/coverage-zones.get.tags[0]
contracts typecheck:   695:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/stores/{storeId}/verifications.post
contracts typecheck:   698:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/stores/{storeId}/verifications.post.tags[0]
contracts typecheck:   730:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/stores/{storeId}/pickup-readiness.post
contracts typecheck:   733:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/stores/{storeId}/pickup-readiness.post.tags[0]
contracts typecheck:   765:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/stores/{storeId}/governance.post
contracts typecheck:   768:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/stores/{storeId}/governance.post.tags[0]
contracts typecheck:   800:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/diagnostics/stores/{storeId}.get
contracts typecheck:   803:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/diagnostics/stores/{storeId}.get.tags[0]
contracts typecheck:   828:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/stores/{storeId}/audit.get
contracts typecheck:   831:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/stores/{storeId}/audit.get.tags[0]
contracts typecheck:   849:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/stores/{storeId}/catalog.get
contracts typecheck:   853:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/stores/{storeId}/catalog.get.tags[0]
contracts typecheck:   867:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/public/media/{assetId}/{variant}.get
contracts typecheck:   870:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/public/media/{assetId}/{variant}.get.tags[0]
contracts typecheck:   893:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/domains.get
contracts typecheck:   895:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/domains.get.tags[0]
contracts typecheck:   899:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/domains.post
contracts typecheck:   901:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/domains.post.tags[0]
contracts typecheck:   907:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/domains/{domainId}.patch
contracts typecheck:   909:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/domains/{domainId}.patch.tags[0]
contracts typecheck:   937:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/nodes.get
contracts typecheck:   939:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/nodes.get.tags[0]
contracts typecheck:   950:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/nodes.post
contracts typecheck:   952:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/nodes.post.tags[0]
contracts typecheck:   958:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/nodes/{nodeId}.patch
contracts typecheck:   960:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/nodes/{nodeId}.patch.tags[0]
contracts typecheck:   986:9   warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/master-products.get
contracts typecheck:   988:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/master-products.get.tags[0]
contracts typecheck:  1034:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/master-products.post
contracts typecheck:  1036:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/master-products.post.tags[0]
contracts typecheck:  1042:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/master-products/{productId}.patch
contracts typecheck:  1044:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/master-products/{productId}.patch.tags[0]
contracts typecheck:   1073:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/product-proposals.get
contracts typecheck:  1075:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/product-proposals.get.tags[0]
contracts typecheck:  1099:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/product-proposals/{proposalId}/decision.post
contracts typecheck:  1101:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/product-proposals/{proposalId}/decision.post.tags[0]
contracts typecheck:  1112:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/product-proposals/{proposalId}/transition.post
contracts typecheck:  1114:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/product-proposals/{proposalId}/transition.post.tags[0]
contracts typecheck:   1125:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/platform-policies.get
contracts typecheck:  1127:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/platform-policies.get.tags[0]
contracts typecheck:   1133:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/platform-policies/{policyId}.put
contracts typecheck:  1135:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/platform-policies/{policyId}.put.tags[0]
contracts typecheck:  1166:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/platform-policies/{policyId}.patch
contracts typecheck:  1168:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/platform-policies/{policyId}.patch.tags[0]
contracts typecheck:   1199:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/seed-status.get
contracts typecheck:  1201:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/seed-status.get.tags[0]
contracts typecheck:   1208:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/assets.get
contracts typecheck:  1210:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/assets.get.tags[0]
contracts typecheck:  1234:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/assets/upload-intents.post
contracts typecheck:  1236:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/assets/upload-intents.post.tags[0]
contracts typecheck:  1281:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/assets/{assetId}/complete.post
contracts typecheck:  1283:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/assets/{assetId}/complete.post.tags[0]
contracts typecheck:  1295:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/assets/{assetId}.patch
contracts typecheck:  1297:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/assets/{assetId}.patch.tags[0]
contracts typecheck:  1321:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/assets/{assetId}.delete
contracts typecheck:  1323:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/assets/{assetId}.delete.tags[0]
contracts typecheck:  1335:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/assets/{assetId}/review.post
contracts typecheck:  1337:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/assets/{assetId}/review.post.tags[0]
contracts typecheck:  1371:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/assets/{assetId}/link.post
contracts typecheck:  1373:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/assets/{assetId}/link.post.tags[0]
contracts typecheck:  1385:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/assets/{assetId}/links/{linkId}.delete
contracts typecheck:  1387:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/assets/{assetId}/links/{linkId}.delete.tags[0]
contracts typecheck:   1411:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/reels.get
contracts typecheck:  1413:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/reels.get.tags[0]
contracts typecheck:  1441:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/reels/{reelId}/review.post
contracts typecheck:  1443:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/reels/{reelId}/review.post.tags[0]
contracts typecheck:  1474:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/reels.post
contracts typecheck:  1476:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/reels.post.tags[0]
contracts typecheck:   1504:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/public/reels.get
contracts typecheck:  1506:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/public/reels.get.tags[0]
contracts typecheck:   1525:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/asset-links.get
contracts typecheck:  1527:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/asset-links.get.tags[0]
contracts typecheck:   1543:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/domains/{domainId}/images/{role}.put
contracts typecheck:  1545:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/domains/{domainId}/images/{role}.put.tags[0]
contracts typecheck:   1561:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/nodes/{nodeId}/images/{role}.put
contracts typecheck:  1563:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/nodes/{nodeId}/images/{role}.put.tags[0]
contracts typecheck:   1579:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/master-products/{productId}/images/{role}.put
contracts typecheck:  1581:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/master-products/{productId}/images/{role}.put.tags[0]
contracts typecheck:   1597:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/catalog/product-proposals/{proposalId}/images/{role}.put
contracts typecheck:  1599:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/catalog/product-proposals/{proposalId}/images/{role}.put.tags[0]
contracts typecheck:   1615:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/stores/{storeId}/images/{role}.put
contracts typecheck:  1618:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/stores/{storeId}/images/{role}.put.tags[0]
contracts typecheck:   1645:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/stores/{storeId}/assortment.get
contracts typecheck:  1647:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/stores/{storeId}/assortment.get.tags[0]
contracts typecheck:   1654:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/stores/{storeId}/assortment/{masterProductId}.put
contracts typecheck:  1656:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/stores/{storeId}/assortment/{masterProductId}.put.tags[0]
contracts typecheck:   1669:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/catalog/taxonomy.get
contracts typecheck:  1671:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/catalog/taxonomy.get.tags[0]
contracts typecheck:   1677:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/catalog/master-products.get
contracts typecheck:  1679:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/catalog/master-products.get.tags[0]
contracts typecheck:   1685:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/assortment.get
contracts typecheck:  1687:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/assortment.get.tags[0]
contracts typecheck:   1694:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/assortment/{masterProductId}.put
contracts typecheck:  1696:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/assortment/{masterProductId}.put.tags[0]
contracts typecheck:  1709:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/catalog/product-proposals.post
contracts typecheck:  1711:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/catalog/product-proposals.post.tags[0]
contracts typecheck:   1717:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/catalog/product-proposals/{proposalId}.put
contracts typecheck:  1719:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/catalog/product-proposals/{proposalId}.put.tags[0]
contracts typecheck:   1730:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/catalog/taxonomy.get
contracts typecheck:  1732:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/catalog/taxonomy.get.tags[0]
contracts typecheck:   1738:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/catalog/master-products.get
contracts typecheck:  1740:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/catalog/master-products.get.tags[0]
contracts typecheck:   1746:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}.put
contracts typecheck:  1748:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}.put.tags[0]
contracts typecheck:   1765:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/assortment.get
contracts typecheck:  1767:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/assortment.get.tags[0]
contracts typecheck:  1779:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/catalog/product-proposals.post
contracts typecheck:  1781:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/catalog/product-proposals.post.tags[0]
contracts typecheck:   1792:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}.put
contracts typecheck:  1794:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}.put.tags[0]
contracts typecheck:   1817:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/cart.get
contracts typecheck:  1820:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/cart.get.tags[0]
contracts typecheck:  1835:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/cart.delete
contracts typecheck:  1838:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/cart.delete.tags[0]
contracts typecheck:  1853:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/cart/items.post
contracts typecheck:  1856:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/cart/items.post.tags[0]
contracts typecheck:  1873:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/cart/items/{itemId}.delete
contracts typecheck:  1876:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/cart/items/{itemId}.delete.tags[0]
contracts typecheck:  1893:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/cart/serviceability.post
contracts typecheck:  1896:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/cart/serviceability.post.tags[0]
contracts typecheck:   1913:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/carts.get
contracts typecheck:  1916:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/carts.get.tags[0]
contracts typecheck:  1939:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/checkout-intents.post
contracts typecheck:  1942:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/checkout-intents.post.tags[0]
contracts typecheck:   1961:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/checkout-intents/{intentId}.get
contracts typecheck:  1964:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/checkout-intents/{intentId}.get.tags[0]
contracts typecheck:  1982:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/checkout-intents/{intentId}/cancel.post
contracts typecheck:  1985:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/checkout-intents/{intentId}/cancel.post.tags[0]
contracts typecheck:   2003:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/checkout-intents.get
contracts typecheck:  2006:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/checkout-intents.get.tags[0]
contracts typecheck:  2025:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/orders.post
contracts typecheck:  2028:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/orders.post.tags[0]
contracts typecheck:   2043:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/orders.get
contracts typecheck:  2046:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/orders.get.tags[0]
contracts typecheck:   2057:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/orders/{orderId}.get
contracts typecheck:  2060:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/orders/{orderId}.get.tags[0]
contracts typecheck:   2077:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders.get
contracts typecheck:  2080:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders.get.tags[0]
contracts typecheck:  2099:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/accept.post
contracts typecheck:  2102:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/accept.post.tags[0]
contracts typecheck:  2120:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/reject.post
contracts typecheck:  2123:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/reject.post.tags[0]
contracts typecheck:  2147:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/preparing.post
contracts typecheck:  2150:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/preparing.post.tags[0]
contracts typecheck:  2168:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/ready.post
contracts typecheck:  2171:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/ready.post.tags[0]
contracts typecheck:   2189:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/orders.get
contracts typecheck:  2192:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/orders.get.tags[0]
contracts typecheck:  2210:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/orders/{orderId}/cancel.post
contracts typecheck:  2213:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/orders/{orderId}/cancel.post.tags[0]
contracts typecheck:   2249:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/dispatch/assignments.get
contracts typecheck:  2252:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/dispatch/assignments.get.tags[0]
contracts typecheck:  2261:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/dispatch/assignments.post
contracts typecheck:  2264:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/dispatch/assignments.post.tags[0]
contracts typecheck:   2283:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/dispatch/assignments.get
contracts typecheck:  2286:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/dispatch/assignments.get.tags[0]
contracts typecheck:  2297:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/dispatch/assignments/{assignmentId}/accept.post
contracts typecheck:  2300:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/dispatch/assignments/{assignmentId}/accept.post.tags[0]
contracts typecheck:  2318:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/dispatch/assignments/{assignmentId}/decline.post
contracts typecheck:  2321:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/dispatch/assignments/{assignmentId}/decline.post.tags[0]
contracts typecheck:  2344:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/dispatch/assignments/{assignmentId}/status.post
contracts typecheck:  2347:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/dispatch/assignments/{assignmentId}/status.post.tags[0]
contracts typecheck:  2371:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/dispatch/assignments/{assignmentId}/pod.post
contracts typecheck:  2374:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/dispatch/assignments/{assignmentId}/pod.post.tags[0]
contracts typecheck:  2398:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/dispatch/assignments/{assignmentId}/location.post
contracts typecheck:  2404:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/dispatch/assignments/{assignmentId}/location.post.tags[0]
contracts typecheck:   2428:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/orders/{orderId}/tracking.get
contracts typecheck:  2434:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/orders/{orderId}/tracking.get.tags[0]
contracts typecheck:   2451:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/settlements.get
contracts typecheck:  2454:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/settlements.get.tags[0]
contracts typecheck:   2478:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/settlements/summary.get
contracts typecheck:  2481:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/settlements/summary.get.tags[0]
contracts typecheck:   2497:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/refunds.get
contracts typecheck:  2500:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/refunds.get.tags[0]
contracts typecheck:   2524:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/me/finance/settlements.get
contracts typecheck:  2527:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/me/finance/settlements.get.tags[0]
contracts typecheck:   2547:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/me/finance/settlements/summary.get
contracts typecheck:  2550:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/me/finance/settlements/summary.get.tags[0]
contracts typecheck:   2561:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/refunds/{refundId}.get
contracts typecheck:  2564:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/refunds/{refundId}.get.tags[0]
contracts typecheck:   2581:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/ledger/entries.get
contracts typecheck:  2584:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/ledger/entries.get.tags[0]
contracts typecheck:   2620:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/financial-summary.get
contracts typecheck:  2623:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/financial-summary.get.tags[0]
contracts typecheck:   2634:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/cod-records.get
contracts typecheck:  2637:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/cod-records.get.tags[0]
contracts typecheck:   2665:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/commissions.get
contracts typecheck:  2668:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/commissions.get.tags[0]
contracts typecheck:   2695:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/payout-requests.get
contracts typecheck:  2698:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/payout-requests.get.tags[0]
contracts typecheck:  2726:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/payout-requests/{payoutId}/approve.post
contracts typecheck:  2729:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/payout-requests/{payoutId}/approve.post.tags[0]
contracts typecheck:  2746:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/payout-requests/{payoutId}/reject.post
contracts typecheck:  2749:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/payout-requests/{payoutId}/reject.post.tags[0]
contracts typecheck:  2766:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/payout-requests/{payoutId}/process.post
contracts typecheck:  2769:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/payout-requests/{payoutId}/process.post.tags[0]
contracts typecheck:  2788:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/payout-requests/{payoutId}/complete.post
contracts typecheck:  2791:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/payout-requests/{payoutId}/complete.post.tags[0]
contracts typecheck:  2810:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/payout-requests/{payoutId}/fail.post
contracts typecheck:  2813:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/payout-requests/{payoutId}/fail.post.tags[0]
contracts typecheck:  2820:17  warning  operation-success-response  Operation must have at least one "2xx" or "3xx" response.      paths./dsh/control-panel/finance/payout-requests/{payoutId}/fail.post.responses
contracts typecheck:  2827:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/settlements/from-delivered-orders.post
contracts typecheck:  2830:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/settlements/from-delivered-orders.post.tags[0]
contracts typecheck:   2857:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/settlement-policies/{partnerId}.put
contracts typecheck:  2860:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/settlement-policies/{partnerId}.put.tags[0]
contracts typecheck:  2890:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/finance/cod-records/{recordId}/collect.post
contracts typecheck:  2893:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/finance/cod-records/{recordId}/collect.post.tags[0]
contracts typecheck:  2915:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/finance/cod-records/{recordId}/remit.post
contracts typecheck:  2918:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/finance/cod-records/{recordId}/remit.post.tags[0]
contracts typecheck:   2940:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/finance/commissions.get
contracts typecheck:  2943:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/finance/commissions.get.tags[0]
contracts typecheck:   2954:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/finance/payouts.get
contracts typecheck:  2957:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/finance/payouts.get.tags[0]
contracts typecheck:  2966:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/finance/payouts.post
contracts typecheck:  2969:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/finance/payouts.post.tags[0]
contracts typecheck:   2986:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/finance/commissions.get
contracts typecheck:  2989:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/finance/commissions.get.tags[0]
contracts typecheck:   3000:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/finance/wallet.get
contracts typecheck:  3003:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/finance/wallet.get.tags[0]
contracts typecheck:   3014:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/finance/payouts.get
contracts typecheck:  3017:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/finance/payouts.get.tags[0]
contracts typecheck:  3026:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/finance/payouts.post
contracts typecheck:  3029:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/finance/payouts.post.tags[0]
contracts typecheck:   3046:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/finance/payout-destinations.get
contracts typecheck:  3049:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/finance/payout-destinations.get.tags[0]
contracts typecheck:  3058:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/finance/payout-destinations.post
contracts typecheck:  3061:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/finance/payout-destinations.post.tags[0]
contracts typecheck:  3078:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/finance/payout-destinations/{destinationId}.patch
contracts typecheck:  3081:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/finance/payout-destinations/{destinationId}.patch.tags[0]
contracts typecheck:  3100:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/finance/payout-destinations/{destinationId}.delete
contracts typecheck:  3103:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/finance/payout-destinations/{destinationId}.delete.tags[0]
contracts typecheck:   3120:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/reconciliation-cases.get
contracts typecheck:  3123:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/reconciliation-cases.get.tags[0]
contracts typecheck:   3141:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/reconciliation-cases/{caseId}.get
contracts typecheck:  3144:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/reconciliation-cases/{caseId}.get.tags[0]
contracts typecheck:  3161:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/reconciliation-cases/{caseId}/assign.post
contracts typecheck:  3164:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/reconciliation-cases/{caseId}/assign.post.tags[0]
contracts typecheck:  3181:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/control-panel/finance/reconciliation-cases/{caseId}/resolve.post
contracts typecheck:  3184:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/control-panel/finance/reconciliation-cases/{caseId}/resolve.post.tags[0]
contracts typecheck:   3216:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/captain/finance/cod-records.get
contracts typecheck:  3219:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/captain/finance/cod-records.get.tags[0]
contracts typecheck:   3230:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/catalog-approvals.get
contracts typecheck:  3233:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/catalog-approvals.get.tags[0]
contracts typecheck:  3255:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/catalog-approvals.post
contracts typecheck:  3258:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/catalog-approvals.post.tags[0]
contracts typecheck:   3275:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/catalog-approvals/{recordId}.get
contracts typecheck:  3278:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/catalog-approvals/{recordId}.get.tags[0]
contracts typecheck:  3295:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/catalog-approvals/{recordId}/transition.post
contracts typecheck:  3298:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/catalog-approvals/{recordId}/transition.post.tags[0]
contracts typecheck:   3321:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/catalog-approvals.get
contracts typecheck:  3324:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/catalog-approvals.get.tags[0]
contracts typecheck:  3336:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/stores/{storeId}/visits.post
contracts typecheck:  3339:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/stores/{storeId}/visits.post.tags[0]
contracts typecheck:   3357:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/stores/{storeId}/visits.get
contracts typecheck:  3360:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/stores/{storeId}/visits.get.tags[0]
contracts typecheck:   3374:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/work-queue.get
contracts typecheck:  3377:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/work-queue.get.tags[0]
contracts typecheck:  3389:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/visits/{visitId}/complete.post
contracts typecheck:  3392:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/visits/{visitId}/complete.post.tags[0]
contracts typecheck:   3410:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/visits/{visitId}/checks.put
contracts typecheck:  3413:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/visits/{visitId}/checks.put.tags[0]
contracts typecheck:   3434:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/visits/{visitId}/checks.get
contracts typecheck:  3437:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/visits/{visitId}/checks.get.tags[0]
contracts typecheck:  3454:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/stores/{storeId}/escalations.post
contracts typecheck:  3457:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/stores/{storeId}/escalations.post.tags[0]
contracts typecheck:   3477:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/field-readiness/escalations.get
contracts typecheck:  3480:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/field-readiness/escalations.get.tags[0]
contracts typecheck:  3499:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/field-readiness/escalations/{escalationId}.patch
contracts typecheck:  3502:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/field-readiness/escalations/{escalationId}.patch.tags[0]
contracts typecheck:   3525:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/onboarding-status.get
contracts typecheck:  3528:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/onboarding-status.get.tags[0]
contracts typecheck:  3544:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/support/tickets.post
contracts typecheck:  3547:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/support/tickets.post.tags[0]
contracts typecheck:   3563:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/support/tickets.get
contracts typecheck:  3566:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/support/tickets.get.tags[0]
contracts typecheck:   3578:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/support/tickets/{ticketId}.get
contracts typecheck:  3581:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/support/tickets/{ticketId}.get.tags[0]
contracts typecheck:  3599:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/support/tickets/{ticketId}/messages.post
contracts typecheck:  3602:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/support/tickets/{ticketId}/messages.post.tags[0]
contracts typecheck:   3623:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/support/tickets/{ticketId}/messages.get
contracts typecheck:  3626:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/support/tickets/{ticketId}/messages.get.tags[0]
contracts typecheck:   3643:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/support/tickets.get
contracts typecheck:  3646:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/support/tickets.get.tags[0]
contracts typecheck:  3665:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/support/tickets/{ticketId}.patch
contracts typecheck:  3668:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/support/tickets/{ticketId}.patch.tags[0]
contracts typecheck:  3691:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/incidents.post
contracts typecheck:  3694:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/incidents.post.tags[0]
contracts typecheck:   3710:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/incidents.get
contracts typecheck:  3713:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/incidents.get.tags[0]
contracts typecheck:  3732:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/incidents/{incidentId}.patch
contracts typecheck:  3735:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/incidents/{incidentId}.patch.tags[0]
contracts typecheck:   3759:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/analytics/platform.get
contracts typecheck:  3762:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/analytics/platform.get.tags[0]
contracts typecheck:   3774:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/analytics/orders.get
contracts typecheck:  3777:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/analytics/orders.get.tags[0]
contracts typecheck:   3793:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/analytics/delivery.get
contracts typecheck:  3796:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/analytics/delivery.get.tags[0]
contracts typecheck:   3812:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/analytics/support.get
contracts typecheck:  3815:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/analytics/support.get.tags[0]
contracts typecheck:   3831:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/analytics/stores.get
contracts typecheck:  3834:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/analytics/stores.get.tags[0]
contracts typecheck:   3846:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/analytics/performance.get
contracts typecheck:  3849:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/analytics/performance.get.tags[0]
contracts typecheck:  3864:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/internal/wlt/payment-session-events.post
contracts typecheck:  3867:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/internal/wlt/payment-session-events.post.tags[0]
contracts typecheck:   3901:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/notifications.get
contracts typecheck:  3904:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/notifications.get.tags[0]
contracts typecheck:  3916:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/notifications/{notificationId}/read.post
contracts typecheck:  3919:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/notifications/{notificationId}/read.post.tags[0]
contracts typecheck:  3937:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/notifications/read-all.post
contracts typecheck:  3940:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/notifications/read-all.post.tags[0]
contracts typecheck:   3956:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/notifications/preferences.put
contracts typecheck:  3959:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/notifications/preferences.put.tags[0]
contracts typecheck:   3977:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/notifications/config.get
contracts typecheck:  3980:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/notifications/config.get.tags[0]
contracts typecheck:   3990:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/notifications/config.put
contracts typecheck:  3993:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/notifications/config.put.tags[0]
contracts typecheck:   4012:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/campaigns.get
contracts typecheck:  4015:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/campaigns.get.tags[0]
contracts typecheck:  4026:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/campaigns.post
contracts typecheck:  4029:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/campaigns.post.tags[0]
contracts typecheck:   4048:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/campaigns/{campaignId}.get
contracts typecheck:  4051:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/campaigns/{campaignId}.get.tags[0]
contracts typecheck:  4068:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/campaigns/{campaignId}.patch
contracts typecheck:  4071:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/campaigns/{campaignId}.patch.tags[0]
contracts typecheck:  4094:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/campaigns/{campaignId}.delete
contracts typecheck:  4097:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/campaigns/{campaignId}.delete.tags[0]
contracts typecheck:   4120:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/tickers.get
contracts typecheck:  4123:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/tickers.get.tags[0]
contracts typecheck:  4134:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/tickers.post
contracts typecheck:  4137:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/tickers.post.tags[0]
contracts typecheck:  4156:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/tickers/{tickerId}.patch
contracts typecheck:  4159:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/tickers/{tickerId}.patch.tags[0]
contracts typecheck:  4182:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/tickers/{tickerId}.delete
contracts typecheck:  4185:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/tickers/{tickerId}.delete.tags[0]
contracts typecheck:   4208:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/partner-offers.get
contracts typecheck:  4211:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/partner-offers.get.tags[0]
contracts typecheck:  4224:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/partner-offers/{offerId}.patch
contracts typecheck:  4227:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/partner-offers/{offerId}.patch.tags[0]
contracts typecheck:  4250:12  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/marketing/partner-offers/{offerId}.delete
contracts typecheck:  4253:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/marketing/partner-offers/{offerId}.delete.tags[0]
contracts typecheck:   4276:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/marketing/offers.get
contracts typecheck:  4279:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/marketing/offers.get.tags[0]
contracts typecheck:  4290:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/marketing/offers.post
contracts typecheck:  4293:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/marketing/offers.post.tags[0]
contracts typecheck:   4314:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/zones.get
contracts typecheck:  4317:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/zones.get.tags[0]
contracts typecheck:  4327:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/zones.post
contracts typecheck:  4330:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/zones.post.tags[0]
contracts typecheck:  4348:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/zones/{zoneId}.patch
contracts typecheck:  4351:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/zones/{zoneId}.patch.tags[0]
contracts typecheck:   4375:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/sla-rules.get
contracts typecheck:  4378:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/sla-rules.get.tags[0]
contracts typecheck:   4394:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/sla-rules.put
contracts typecheck:  4397:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/sla-rules.put.tags[0]
contracts typecheck:   4415:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/capacity.get
contracts typecheck:  4418:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/capacity.get.tags[0]
contracts typecheck:   4434:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/capacity.put
contracts typecheck:  4437:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/capacity.put.tags[0]
contracts typecheck:   4455:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/serviceability/{zoneId}.get
contracts typecheck:  4458:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/serviceability/{zoneId}.get.tags[0]
contracts typecheck:   4476:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/store-onboarding-fee.get
contracts typecheck:  4479:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/store-onboarding-fee.get.tags[0]
contracts typecheck:   4490:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/platform/store-onboarding-fee.put
contracts typecheck:  4493:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/platform/store-onboarding-fee.put.tags[0]
contracts typecheck:   4511:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/platform/store-onboarding-fee.get
contracts typecheck:  4514:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/platform/store-onboarding-fee.get.tags[0]
contracts typecheck:   4528:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/roles.get
contracts typecheck:  4531:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/roles.get.tags[0]
contracts typecheck:  4541:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/roles.post
contracts typecheck:  4544:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/roles.post.tags[0]
contracts typecheck:   4562:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/staff.get
contracts typecheck:  4565:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/staff.get.tags[0]
contracts typecheck:  4577:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/staff/{staffId}/roles.post
contracts typecheck:  4580:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/staff/{staffId}/roles.post.tags[0]
contracts typecheck:   4606:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners.get
contracts typecheck:  4609:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners.get.tags[0]
contracts typecheck:  4633:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners.post
contracts typecheck:  4636:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners.post.tags[0]
contracts typecheck:   4655:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}.get
contracts typecheck:  4658:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}.get.tags[0]
contracts typecheck:  4676:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/transition.post
contracts typecheck:  4679:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/transition.post.tags[0]
contracts typecheck:   4709:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/readiness.get
contracts typecheck:  4712:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/readiness.get.tags[0]
contracts typecheck:   4730:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/documents.get
contracts typecheck:  4733:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/documents.get.tags[0]
contracts typecheck:  4749:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/documents.post
contracts typecheck:  4752:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/documents.post.tags[0]
contracts typecheck:  4775:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/documents/{docId}/review.patch
contracts typecheck:  4778:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/documents/{docId}/review.patch.tags[0]
contracts typecheck:   4806:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/stores.get
contracts typecheck:  4809:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/stores.get.tags[0]
contracts typecheck:  4825:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/stores.post
contracts typecheck:  4828:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/stores.post.tags[0]
contracts typecheck:   4852:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/audit.get
contracts typecheck:  4855:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/audit.get.tags[0]
contracts typecheck:   4873:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partners/{partnerId}/field-visits.get
contracts typecheck:  4876:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partners/{partnerId}/field-visits.get.tags[0]
contracts typecheck:   4900:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/activation/status.get
contracts typecheck:  4903:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/activation/status.get.tags[0]
contracts typecheck:   4916:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/activation/readiness.get
contracts typecheck:  4919:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/activation/readiness.get.tags[0]
contracts typecheck:   4931:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/team.get
contracts typecheck:  4934:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/team.get.tags[0]
contracts typecheck:  4958:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/team/invites.post
contracts typecheck:  4961:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/team/invites.post.tags[0]
contracts typecheck:  4993:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/stores/{storeId}/team/members/{memberId}/action.post
contracts typecheck:  4996:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/stores/{storeId}/team/members/{memberId}/action.post.tags[0]
contracts typecheck:   5033:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/scopes.get
contracts typecheck:  5036:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/scopes.get.tags[0]
contracts typecheck:   5054:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/invites.get
contracts typecheck:  5057:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/invites.get.tags[0]
contracts typecheck:  5075:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/invites/{inviteId}/accept.post
contracts typecheck:  5078:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/invites/{inviteId}/accept.post.tags[0]
contracts typecheck:  5101:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/invites/{inviteId}/reject.post
contracts typecheck:  5104:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/invites/{inviteId}/reject.post.tags[0]
contracts typecheck:   5127:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners.get
contracts typecheck:  5130:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners.get.tags[0]
contracts typecheck:  5153:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/drafts.post
contracts typecheck:  5156:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/drafts.post.tags[0]
contracts typecheck:   5175:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}.get
contracts typecheck:  5178:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}.get.tags[0]
contracts typecheck:  5194:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}.patch
contracts typecheck:  5197:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}.patch.tags[0]
contracts typecheck:   5221:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/readiness.get
contracts typecheck:  5224:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/readiness.get.tags[0]
contracts typecheck:   5243:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/store.get
contracts typecheck:  5246:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/store.get.tags[0]
contracts typecheck:  5268:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/store.patch
contracts typecheck:  5271:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/store.patch.tags[0]
contracts typecheck:   5301:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/documents.get
contracts typecheck:  5304:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/documents.get.tags[0]
contracts typecheck:  5326:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/documents.post
contracts typecheck:  5329:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/documents.post.tags[0]
contracts typecheck:  5353:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/media/uploads.post
contracts typecheck:  5356:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/media/uploads.post.tags[0]
contracts typecheck:   5384:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/media.get
contracts typecheck:  5387:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/media.get.tags[0]
contracts typecheck:  5408:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/visits.post
contracts typecheck:  5411:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/visits.post.tags[0]
contracts typecheck:   5434:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/field-visits.get
contracts typecheck:  5437:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/field-visits.get.tags[0]
contracts typecheck:  5461:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/field/partners/{partnerId}/submit.post
contracts typecheck:  5464:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/field/partners/{partnerId}/submit.post.tags[0]
contracts typecheck:   5497:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/partners.get
contracts typecheck:  5500:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/partners.get.tags[0]
contracts typecheck:  5512:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/partners/{partnerId}/activate.post
contracts typecheck:  5515:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/partners/{partnerId}/activate.post.tags[0]
contracts typecheck:  5539:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/partners/{partnerId}/block.post
contracts typecheck:  5542:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/partners/{partnerId}/block.post.tags[0]
contracts typecheck:   5566:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/captains.get
contracts typecheck:  5569:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/captains.get.tags[0]
contracts typecheck:  5581:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/captains/{captainId}/credential.post
contracts typecheck:  5584:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/captains/{captainId}/credential.post.tags[0]
contracts typecheck:   5608:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/admin/audit.get
contracts typecheck:  5611:14  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/admin/audit.get.tags[0]
contracts typecheck:  5622:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/special-requests.post
contracts typecheck:  5626:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/special-requests.post.tags[0]
contracts typecheck:   5641:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/special-requests.get
contracts typecheck:  5645:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/special-requests.get.tags[0]
contracts typecheck:   5663:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/special-requests/{requestId}.get
contracts typecheck:  5667:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/special-requests/{requestId}.get.tags[0]
contracts typecheck:  5684:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/special-requests/{requestId}/cancel.post
contracts typecheck:  5688:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/special-requests/{requestId}/cancel.post.tags[0]
contracts typecheck:  5706:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/client/special-requests/{requestId}/approve-quote.post
contracts typecheck:  5710:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/client/special-requests/{requestId}/approve-quote.post.tags[0]
contracts typecheck:   5738:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/special-requests.get
contracts typecheck:  5742:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/special-requests.get.tags[0]
contracts typecheck:   5767:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/special-requests/{requestId}.get
contracts typecheck:  5771:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/special-requests/{requestId}.get.tags[0]
contracts typecheck:  5787:11  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/special-requests/{requestId}.patch
contracts typecheck:  5791:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/special-requests/{requestId}.patch.tags[0]
contracts typecheck:  5814:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/special-requests/{requestId}/dispatch.post
contracts typecheck:  5818:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/special-requests/{requestId}/dispatch.post.tags[0]
contracts typecheck:  5846:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/partner-delivery/assign.post
contracts typecheck:  5850:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/partner-delivery/assign.post.tags[0]
contracts typecheck:  5884:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/partner-delivery/pickup.post
contracts typecheck:  5888:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/partner-delivery/pickup.post.tags[0]
contracts typecheck:  5922:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/partner-delivery/depart.post
contracts typecheck:  5926:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/partner-delivery/depart.post.tags[0]
contracts typecheck:  5960:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/partner-delivery/arrive.post
contracts typecheck:  5964:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/partner-delivery/arrive.post.tags[0]
contracts typecheck:  5998:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/partner-delivery/proof.post
contracts typecheck:  6002:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/partner-delivery/proof.post.tags[0]
contracts typecheck:  6036:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/partner-delivery/exception.post
contracts typecheck:  6040:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/partner-delivery/exception.post.tags[0]
contracts typecheck:   6074:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partner-deliveries.get
contracts typecheck:  6078:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partner-deliveries.get.tags[0]
contracts typecheck:   6103:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/partner-deliveries/{taskId}.get
contracts typecheck:  6107:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/partner-deliveries/{taskId}.get.tags[0]
contracts typecheck:  6125:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/pickup/mark-ready.post
contracts typecheck:  6129:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/pickup/mark-ready.post.tags[0]
contracts typecheck:  6158:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/pickup/notify.post
contracts typecheck:  6162:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/pickup/notify.post.tags[0]
contracts typecheck:  6196:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/pickup/customer-arrived.post
contracts typecheck:  6200:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/pickup/customer-arrived.post.tags[0]
contracts typecheck:  6229:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/pickup/verify.post
contracts typecheck:  6233:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/pickup/verify.post.tags[0]
contracts typecheck:  6267:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/partner/orders/{orderId}/pickup/no-show.post
contracts typecheck:  6271:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/partner/orders/{orderId}/pickup/no-show.post.tags[0]
contracts typecheck:   6305:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/pickups.get
contracts typecheck:  6309:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/pickups.get.tags[0]
contracts typecheck:   6331:9  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/pickups/{orderId}.get
contracts typecheck:  6335:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/pickups/{orderId}.get.tags[0]
contracts typecheck:  6353:10  warning  operation-description       Operation "description" must be present and non-empty string.  paths./dsh/operator/pickups/{orderId}/extend-window.post
contracts typecheck:  6357:11  warning  operation-tag-defined       Operation tags must be defined in global tags.                 paths./dsh/operator/pickups/{orderId}/extend-window.post.tags[0]
contracts typecheck:  6926:22  warning  oas3-unused-component       Potentially unused component has been detected.                components.schemas.DshMasterProduct
contracts typecheck:  8431:29  warning  oas3-unused-component       Potentially unused component has been detected.                components.schemas.DshPartnersListResponse
contracts typecheck:  9141:24  warning  oas3-unused-component       Potentially unused component has been detected.                components.schemas.DshCaptainIdentity
contracts typecheck: /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/wlt/contracts/wlt.openapi.yaml
contracts typecheck:    1:1    warning  oas3-api-servers       OpenAPI "servers" must be present and non-empty array.
contracts typecheck:    2:6    warning  info-contact           Info object must have "contact" object.                        info
contracts typecheck:    15:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/health.get
contracts typecheck:   19:11   warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/health.get.tags[0]
contracts typecheck:    29:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/readiness.get
contracts typecheck:   33:11   warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/readiness.get.tags[0]
contracts typecheck:    45:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/references/payment-status.get
contracts typecheck:   49:11   warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/references/payment-status.get.tags[0]
contracts typecheck:    69:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/references/settlement-status.get
contracts typecheck:   73:11   warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/references/settlement-status.get.tags[0]
contracts typecheck:    93:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/references/refund-status.get
contracts typecheck:   97:11   warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/references/refund-status.get.tags[0]
contracts typecheck:   117:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/references/wallet-status.get
contracts typecheck:   121:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/references/wallet-status.get.tags[0]
contracts typecheck:   152:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/wallets/{actorType}/{actorId}.get
contracts typecheck:   156:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/wallets/{actorType}/{actorId}.get.tags[0]
contracts typecheck:   186:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/reconciliation-cases.get
contracts typecheck:   190:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/reconciliation-cases.get.tags[0]
contracts typecheck:   208:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/reconciliation-cases/{caseId}.get
contracts typecheck:   212:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/reconciliation-cases/{caseId}.get.tags[0]
contracts typecheck:   232:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/reconciliation-cases/{caseId}/assign.post
contracts typecheck:   236:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/reconciliation-cases/{caseId}/assign.post.tags[0]
contracts typecheck:   262:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/reconciliation-cases/{caseId}/resolve.post
contracts typecheck:   266:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/reconciliation-cases/{caseId}/resolve.post.tags[0]
contracts typecheck:   294:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payout-requests.post
contracts typecheck:   298:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-requests.post.tags[0]
contracts typecheck:   327:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-requests.get.tags[0]
contracts typecheck:   351:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payout-requests/{payoutId}.get
contracts typecheck:   355:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-requests/{payoutId}.get.tags[0]
contracts typecheck:   374:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payout-requests/{payoutId}/approve.post
contracts typecheck:   378:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-requests/{payoutId}/approve.post.tags[0]
contracts typecheck:   399:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payout-requests/{payoutId}/reject.post
contracts typecheck:   403:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-requests/{payoutId}/reject.post.tags[0]
contracts typecheck:   424:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payout-requests/{payoutId}/process.post
contracts typecheck:   428:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-requests/{payoutId}/process.post.tags[0]
contracts typecheck:   449:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payout-requests/{payoutId}/complete.post
contracts typecheck:   453:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-requests/{payoutId}/complete.post.tags[0]
contracts typecheck:   474:10  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payout-requests/{payoutId}/fail.post
contracts typecheck:   478:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-requests/{payoutId}/fail.post.tags[0]
contracts typecheck:   504:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payment-sessions.post.tags[0]
contracts typecheck:   547:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payment-sessions/{paymentSessionId}.get
contracts typecheck:   551:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payment-sessions/{paymentSessionId}.get.tags[0]
contracts typecheck:   580:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payment-sessions/{paymentSessionId}/authorize.post.tags[0]
contracts typecheck:   619:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payment-sessions/{paymentSessionId}/capture.post.tags[0]
contracts typecheck:   650:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payment-sessions/{paymentSessionId}/expire.post.tags[0]
contracts typecheck:   695:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payment-sessions/{paymentSessionId}/cancel-for-order.post.tags[0]
contracts typecheck:   734:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payment-sessions/{paymentSessionId}/cod-collect.post.tags[0]
contracts typecheck:   765:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/refunds.post.tags[0]
contracts typecheck:   787:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/refunds.get
contracts typecheck:   791:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/refunds.get.tags[0]
contracts typecheck:   822:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/refunds/{refundId}.get
contracts typecheck:   826:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/refunds/{refundId}.get.tags[0]
contracts typecheck:   865:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/refunds/{refundId}/approve.post.tags[0]
contracts typecheck:   896:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/refunds/{refundId}/complete.post.tags[0]
contracts typecheck:   927:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/refunds/{refundId}/reject.post.tags[0]
contracts typecheck:   959:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/settlements.post.tags[0]
contracts typecheck:   979:9   warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/settlements.get
contracts typecheck:   983:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/settlements.get.tags[0]
contracts typecheck:   1011:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/settlements/summary.get
contracts typecheck:  1015:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/settlements/summary.get.tags[0]
contracts typecheck:   1053:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/settlements/{settlementId}.get
contracts typecheck:  1057:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/settlements/{settlementId}.get.tags[0]
contracts typecheck:  1096:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/settlements/{settlementId}/post.post.tags[0]
contracts typecheck:  1126:14  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/settlement-policies/{partnerId}.put.tags[0]
contracts typecheck:  1158:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/cod-records.post.tags[0]
contracts typecheck:   1189:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/cod-records.get
contracts typecheck:  1193:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/cod-records.get.tags[0]
contracts typecheck:   1224:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/cod-records/{codRecordId}.get
contracts typecheck:  1228:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/cod-records/{codRecordId}.get.tags[0]
contracts typecheck:  1267:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/cod-records/{codRecordId}/collect.post.tags[0]
contracts typecheck:  1300:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/cod-records/{codRecordId}/remit.post.tags[0]
contracts typecheck:  1333:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/commissions.post.tags[0]
contracts typecheck:  1371:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/commissions.get.tags[0]
contracts typecheck:  1411:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/commissions/{commissionId}/confirm.post.tags[0]
contracts typecheck:  1438:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/commissions/{commissionId}/settle.post.tags[0]
contracts typecheck:  1465:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/commissions/{commissionId}/reject.post.tags[0]
contracts typecheck:  1503:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/commissions/{commissionId}/reverse.post.tags[0]
contracts typecheck:  1545:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/ledger/entries.post.tags[0]
contracts typecheck:   1563:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/ledger/entries.get
contracts typecheck:  1567:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/ledger/entries.get.tags[0]
contracts typecheck:   1622:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/ledger/entries/{entryId}.get
contracts typecheck:  1626:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/ledger/entries/{entryId}.get.tags[0]
contracts typecheck:   1656:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/ledger/financial-summary.get
contracts typecheck:  1666:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/ledger/financial-summary.get.tags[0]
contracts typecheck:  1696:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-destinations/{partnerId}.put.tags[0]
contracts typecheck:   1720:9  warning  operation-description  Operation "description" must be present and non-empty string.  paths./wlt/payout-destinations/{partnerId}.get
contracts typecheck:  1724:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-destinations/{partnerId}.get.tags[0]
contracts typecheck:  1751:11  warning  operation-tag-defined  Operation tags must be defined in global tags.                 paths./wlt/payout-destinations/{partnerId}/deactivate.post.tags[0]
contracts typecheck:  2010:35  warning  oas3-unused-component  Potentially unused component has been detected.                components.schemas.WltFieldCommissionRefResponse
contracts typecheck: ✖ 737 problems (0 errors, 737 warnings, 0 infos, 0 hints)
shared/ui-kit typecheck: Done
contracts typecheck: contracts-typecheck: OK
contracts typecheck: Done
apps/app-captain/runtime typecheck$ tsc --noEmit -p tsconfig.json
apps/app-client/runtime typecheck$ tsc --noEmit -p tsconfig.json
apps/app-field/runtime typecheck$ tsc --noEmit -p tsconfig.json
apps/app-partner/runtime typecheck$ tsc --noEmit -p tsconfig.json
apps/app-field/runtime typecheck: ../../../services/dsh/frontend/shared/partner/use-field-catalog-controller.tsx(124,112): error TS2379: Argument of type '{ unitPrice: number; currency: string; available: boolean; stockStatus: "in_stock" | "low_stock" | "out_of_stock"; localNote: string; customImageObjectKey: null; publicationStatus: "hidden" | ... 4 more ... | "rejected"; expectedVersion: number | undefined; }' is not assignable to parameter of type '{ expectedVersion?: number; unitPrice: number; currency: string; available: boolean; stockStatus: "in_stock" | "low_stock" | "out_of_stock"; localNote: string; customImageObjectKey: string | null; publicationStatus: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
apps/app-field/runtime typecheck:   Types of property 'expectedVersion' are incompatible.
apps/app-field/runtime typecheck:     Type 'number | undefined' is not assignable to type 'number'.
apps/app-field/runtime typecheck:       Type 'undefined' is not assignable to type 'number'.
apps/app-field/runtime typecheck: Failed
/home/runner/work/bthwani-suite-next/bthwani-suite-next/apps/app-field/runtime:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @bthwani/app-field-runtime@0.0.0 typecheck: `tsc --noEmit -p tsconfig.json`
Exit status 2
apps/control-panel/runtime typecheck$ tsc --noEmit -p tsconfig.json
 ELIFECYCLE  Command failed with exit code 2.

exit_code=2
```
