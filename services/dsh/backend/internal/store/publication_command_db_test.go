package store

import (
	"context"
	"database/sql"
	"errors"
	"testing"
)

type publicationFixture struct {
	operatorContextID string
	actorID           string
	partnerID         string
	storeID           string
	domainID          string
	productID         string
	assortmentID      string
}

func seedPublicationFixture(t *testing.T, db execQueryRower) publicationFixture {
	t.Helper()
	suffix := uniqueID("publication")
	fixture := publicationFixture{
		operatorContextID: "context-" + suffix,
		actorID:           "marketing-" + suffix,
		partnerID:         "partner-" + suffix,
		storeID:           "store-" + suffix,
		domainID:          "domain-" + suffix,
		productID:         "product-" + suffix,
		assortmentID:      "assortment-" + suffix,
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_partners
		  (id, legal_name_ar, display_name, legal_identity_number, primary_phone,
		   activation_status, created_by_actor_id, operator_context_id)
		VALUES ($1,'شريك نشر','شريك نشر',$2,'777000002','partner_active',$3,$4)`,
		fixture.partnerID, fixture.partnerID, fixture.actorID, fixture.operatorContextID); err != nil {
		t.Fatalf("insert publication partner: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_catalog_domains
		  (id, slug, name_ar, is_active, is_client_visible)
		VALUES ($1,$1,'نطاق نشر',TRUE,TRUE)`, fixture.domainID); err != nil {
		t.Fatalf("insert publication domain: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_stores
		  (id, slug, display_name, status, city_code, service_area_code,
		   serviceability_status, is_visible, hero_image_url, logo_url,
		   catalog_domain_id, delivery_modes, partner_readiness,
		   catalog_approval_status, marketing_visibility, partner_id,
		   address_line, coverage_summary, operating_hours, delivery_readiness,
		   operator_context_id)
		VALUES
		  ($1,$1,'متجر نشر','ready','SAN','SAN-1','serviceable',FALSE,
		   'https://media.example/cover.webp','https://media.example/logo.webp',
		   $2,ARRAY['delivery']::TEXT[],'ready','approved','hidden',$3,
		   'صنعاء','نطاق صنعاء','08:00-22:00','ready',$4)`,
		fixture.storeID, fixture.domainID, fixture.partnerID, fixture.operatorContextID); err != nil {
		t.Fatalf("insert publication store: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_master_products
		  (id, domain_id, canonical_name_ar, approval_status, is_active)
		VALUES ($1,$2,'منتج نشر','approved',TRUE)`, fixture.productID, fixture.domainID); err != nil {
		t.Fatalf("insert publication product: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_store_catalog_domains
		  (store_id, domain_id, status, approved_by, approved_at)
		VALUES ($1,$2,'approved',$3,NOW())`, fixture.storeID, fixture.domainID, fixture.actorID); err != nil {
		t.Fatalf("approve publication store domain: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_store_assortments
		  (id, store_id, master_product_id, unit_price, currency, available,
		   stock_status, publication_status, approved_by)
		VALUES ($1,$2,$3,100,'YER',TRUE,'in_stock','client_visible',$4)`,
		fixture.assortmentID, fixture.storeID, fixture.productID, fixture.actorID); err != nil {
		t.Fatalf("insert publication assortment: %v", err)
	}
	return fixture
}

func cleanupPublicationFixture(t *testing.T, db *sql.DB, fixture publicationFixture) {
	t.Helper()
	ctx := context.Background()
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_publication_decisions WHERE store_id=$1`, fixture.storeID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_action_audit WHERE store_id=$1`, fixture.storeID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_idempotency WHERE actor_id=$1`, fixture.actorID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE store_id=$1`, fixture.storeID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id=$1`, fixture.storeID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_publication_override_policies WHERE operator_context_id=$1`, fixture.operatorContextID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, fixture.storeID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id=$1`, fixture.productID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id=$1`, fixture.domainID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id=$1`, fixture.partnerID)
}

func publicationActor(fixture publicationFixture, permission string) StoreActor {
	return StoreActor{
		ID:                 fixture.actorID,
		Role:               "operator",
		OperatorContextID:  fixture.operatorContextID,
		AuthorizedAction:   permission,
		AuthorizationScope: "all",
	}
}

func TestMarketingPublicationCommandOwnsAtomicStorePublication(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	fixture := seedPublicationFixture(t, db)
	t.Cleanup(func() { cleanupPublicationFixture(t, db, fixture) })

	partnersActor := publicationActor(fixture, "partners.manage")
	if _, err := GovernStore(ctx, db, partnersActor, fixture.storeID,
		"partners-publish-key", "partners-publish-correlation", OperatorGovernanceInput{
			ExpectedVersion: 1, Action: "lifecycle", Value: "published", Reason: "direct publish denied",
		}); err == nil {
		t.Fatal("partners governance must not publish a store directly")
	}
	if _, err := GovernStore(ctx, db, partnersActor, fixture.storeID,
		"partners-visible-key", "partners-visible-correlation", OperatorGovernanceInput{
			ExpectedVersion: 1, Action: "visibility", Value: "visible", Reason: "direct visibility denied",
		}); err == nil {
		t.Fatal("partners governance must not mutate client visibility directly")
	}

	actor := publicationActor(fixture, "marketing.manage")
	published, err := PublishStore(ctx, db, actor, fixture.storeID,
		"marketing-publish-key", "marketing-publish-correlation", StorePublicationInput{
			ExpectedVersion: 1, Decision: "publish", Reason: "all publication gates complete",
		})
	if err != nil {
		t.Fatalf("publish fully ready store: %v", err)
	}
	if published.Store.ID != fixture.storeID || published.Store.Status != StatusPublished || !published.Store.IsVisible || published.Store.MarketingVisibility != "visible" {
		t.Fatalf("unexpected atomic publication readback: %#v", published.Store)
	}
	if published.Store.Version != 2 || published.Replayed {
		t.Fatalf("unexpected initial publication receipt: %#v", published)
	}
	publicStore, err := GetStoreByID(db, fixture.storeID)
	if err != nil {
		t.Fatalf("read published store through public storefront repository: %v", err)
	}
	if publicStore.ID != fixture.storeID || publicStore.Status != StatusPublished || !publicStore.IsVisible {
		t.Fatalf("public storefront readback must retain the exact published store identity: %#v", publicStore)
	}
	var partnerStatus string
	if err := db.QueryRowContext(ctx, `SELECT activation_status FROM dsh_partners WHERE id=$1`, fixture.partnerID).Scan(&partnerStatus); err != nil {
		t.Fatalf("read partner publication transition: %v", err)
	}
	if partnerStatus != "client_visible" {
		t.Fatalf("expected owning partner client_visible, got %s", partnerStatus)
	}
	var partnerPublicationEvents int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_partner_activation_events
		WHERE partner_id=$1
		  AND from_status='partner_active'
		  AND to_status='client_visible'
		  AND actor_id=$2
		  AND actor_surface='control-panel'`, fixture.partnerID, fixture.actorID).Scan(&partnerPublicationEvents); err != nil {
		t.Fatalf("read partner publication activation audit: %v", err)
	}
	if partnerPublicationEvents != 1 {
		t.Fatalf("expected one audited partner publication transition, got %d", partnerPublicationEvents)
	}

	replayed, err := PublishStore(ctx, db, actor, fixture.storeID,
		"marketing-publish-key", "marketing-publish-correlation", StorePublicationInput{
			ExpectedVersion: 1, Decision: "publish", Reason: "all publication gates complete",
		})
	if err != nil || !replayed.Replayed || replayed.Store.ID != fixture.storeID {
		t.Fatalf("expected exact idempotent publication replay, response=%#v err=%v", replayed, err)
	}

	hidden, err := PublishStore(ctx, db, actor, fixture.storeID,
		"marketing-hide-key", "marketing-hide-correlation", StorePublicationInput{
			ExpectedVersion: 2, Decision: "hide", Reason: "temporary marketing hold",
		})
	if err != nil {
		t.Fatalf("hide store through marketing command: %v", err)
	}
	if hidden.Store.IsVisible || hidden.Store.MarketingVisibility != "hidden" || hidden.Store.Version != 3 {
		t.Fatalf("unexpected hide readback: %#v", hidden.Store)
	}

	var decisions, audits int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_store_publication_decisions WHERE store_id=$1`, fixture.storeID).Scan(&decisions); err != nil {
		t.Fatalf("count publication decisions: %v", err)
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_store_action_audit WHERE store_id=$1 AND action='marketing.store.publication'`, fixture.storeID).Scan(&audits); err != nil {
		t.Fatalf("count publication audits: %v", err)
	}
	if decisions != 2 || audits != 2 {
		t.Fatalf("idempotent replay must not duplicate durable evidence: decisions=%d audits=%d", decisions, audits)
	}
}

func TestMarketingPublicationOverrideIsFailClosedAndPolicyBound(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	fixture := seedPublicationFixture(t, db)
	t.Cleanup(func() { cleanupPublicationFixture(t, db, fixture) })
	actor := publicationActor(fixture, "marketing.manage")

	if _, err := db.ExecContext(ctx, `UPDATE dsh_stores SET coverage_summary='' WHERE id=$1`, fixture.storeID); err != nil {
		t.Fatalf("create policy-bound blocker: %v", err)
	}
	_, err := PublishStore(ctx, db, actor, fixture.storeID,
		"override-disabled-key", "override-disabled-correlation", StorePublicationInput{
			ExpectedVersion: 1, Decision: "publish", Reason: "request controlled override",
			Override: true, OverrideReason: "approved operational exception",
		})
	if !errors.Is(err, ErrPublicationGate) {
		t.Fatalf("missing policy must fail closed with publication gate error, got %v", err)
	}
	var version int
	var visible bool
	if err := db.QueryRowContext(ctx, `SELECT version, is_visible FROM dsh_stores WHERE id=$1`, fixture.storeID).Scan(&version, &visible); err != nil {
		t.Fatalf("read failed override state: %v", err)
	}
	if version != 1 || visible {
		t.Fatalf("failed override must be atomic: version=%d visible=%v", version, visible)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_publication_override_policies
		  (operator_context_id, enabled, allowed_blocker_codes, updated_by)
		VALUES ($1,TRUE,ARRAY['COVERAGE_MISSING']::TEXT[],$2)`, fixture.operatorContextID, fixture.actorID); err != nil {
		t.Fatalf("insert durable override policy: %v", err)
	}
	overridden, err := PublishStore(ctx, db, actor, fixture.storeID,
		"override-enabled-key", "override-enabled-correlation", StorePublicationInput{
			ExpectedVersion: 1, Decision: "publish", Reason: "request controlled override",
			Override: true, OverrideReason: "approved operational exception",
		})
	if err != nil {
		t.Fatalf("policy-permitted override: %v", err)
	}
	if overridden.Store.ID != fixture.storeID || !overridden.Store.IsVisible {
		t.Fatalf("unexpected override publication readback: %#v", overridden.Store)
	}
	var overrideApplied bool
	var blockerCount int
	if err := db.QueryRowContext(ctx, `
		SELECT override_applied, jsonb_array_length(gate_blockers)
		FROM dsh_store_publication_decisions
		WHERE store_id=$1 ORDER BY created_at DESC LIMIT 1`, fixture.storeID).
		Scan(&overrideApplied, &blockerCount); err != nil {
		t.Fatalf("read override audit evidence: %v", err)
	}
	if !overrideApplied || blockerCount != 1 {
		t.Fatalf("override evidence must retain decision and blocker: applied=%v blockers=%d", overrideApplied, blockerCount)
	}
}
