package cart

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"sync"
	"testing"
	"time"

	"dsh-api/internal/servicearea"
	"dsh-api/internal/wlt"
	_ "github.com/lib/pq"
)

type captureWltQuoter struct {
	input wlt.CalculatePricingQuoteRequest
}

func (c *captureWltQuoter) CalculateQuote(_ context.Context, input wlt.CalculatePricingQuoteRequest) (*wlt.WltPricingQuote, error) {
	c.input = input
	return &wlt.WltPricingQuote{
		Hash:             "cart-readback-quote-hash",
		ExpiresAt:        func() *time.Time { value := time.Now().Add(time.Minute); return &value }(),
		CartSnapshotHash: input.CartSnapshotHash,
	}, nil
}

func openRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestFetchDeliveryFeeMinorUnitsUsesCanonicalModeScopedPolicyDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-delivery-policy-store-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores
			(id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, delivery_modes)
		VALUES ($1, $1, 'Cart Delivery Policy Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true,
			ARRAY['express', 'delivery', 'pickup']::text[])`, storeID); err != nil {
		t.Fatalf("failed to insert delivery policy test store: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_delivery_pricing WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_delivery_pricing
			(store_id, fulfillment_mode, pricing_mode, fee_minor_units, currency, pricing_config, status, pricing_source,
			 created_by_actor_id, approved_by_actor_id, approved_at)
		VALUES
			($1, 'bthwani_delivery', 'bthwani_pricing', 95000, 'YER', '{}'::jsonb, 'active', 'platform_default', 'test', 'test', NOW()),
			($1, 'partner_delivery', 'partner_fixed_pricing', 120000, 'YER', '{}'::jsonb, 'active', 'platform_default', 'test', 'test', NOW()),
			($1, 'pickup', 'free_delivery', 0, 'YER', '{}'::jsonb, 'active', 'platform_default', 'test', 'test', NOW())`, storeID); err != nil {
		t.Fatalf("failed to insert delivery policies: %v", err)
	}

	fee, err := FetchDeliveryFeeMinorUnits(ctx, db, storeID, ModeBthwaniDelivery)
	if err != nil || fee != 95000 {
		t.Fatalf("expected bthwani delivery fee 95000 from canonical mode policy, got fee=%d err=%v", fee, err)
	}
	fee, err = FetchDeliveryFeeMinorUnits(ctx, db, storeID, ModePartnerDelivery)
	if err != nil || fee != 120000 {
		t.Fatalf("expected partner delivery fee 120000 from canonical mode policy, got fee=%d err=%v", fee, err)
	}
}

func TestComputeCheckoutSnapshotDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-price-test-store-" + suffix
	clientID := "cart-price-test-client-" + suffix
	domainID := "domain-" + suffix
	productID := "prod-" + suffix
	assortmentID := "assortment-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, delivery_modes)
		VALUES ($1, $1, 'Cart Price Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true, ARRAY['express']::text[])`, storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_delivery_pricing WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id IN (SELECT id FROM dsh_carts WHERE store_id = $1)`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id = $1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id = $1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_delivery_pricing
			(store_id, fulfillment_mode, pricing_mode, fee_minor_units, currency, pricing_config, status, pricing_source,
			 created_by_actor_id, approved_by_actor_id, approved_at)
		VALUES ($1, 'bthwani_delivery', 'free_delivery', 0, 'USD', '{}'::jsonb, 'active', 'platform_default', 'test', 'test', NOW())`, storeID); err != nil {
		t.Fatalf("failed to insert cart quote delivery policy: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_catalog_domains (id, slug, name_ar)
		VALUES ($1, $1, 'Cart Price Test Domain') RETURNING id`, domainID).Scan(&domainID); err != nil {
		t.Fatalf("failed to insert test domain: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_master_products (id, domain_id, canonical_name_ar, sku, approval_status, is_active)
		VALUES ($1, $2, 'Test Widget', $3, 'approved', true) RETURNING id`, productID, domainID, "sku-"+suffix).Scan(&productID); err != nil {
		t.Fatalf("failed to insert test master product: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_at)
		VALUES ($1, $2, 'approved', NOW())`, storeID, domainID); err != nil {
		t.Fatalf("failed to approve test store domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortments (id, store_id, master_product_id, publication_status)
		VALUES ($1, $2, $3, 'client_visible')`, assortmentID, storeID, productID); err != nil {
		t.Fatalf("failed to insert test store assortment: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_prices (id, store_assortment_id, amount_minor, currency, effective_from)
		VALUES ($1, $2, 2550, 'USD', NOW())`, "price-"+suffix, assortmentID); err != nil {
		t.Fatalf("failed to insert test assortment price: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_inventory (store_assortment_id, policy_type, quantity, reserved_quantity, min_order_quantity, max_order_quantity, step_quantity)
		VALUES ($1, 'quantity', 100, 0, 1, 100, 1)`, assortmentID); err != nil {
		t.Fatalf("failed to insert test assortment inventory: %v", err)
	}

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'bthwani_delivery', 'active') RETURNING id::text`, clientID, storeID).Scan(&cartID); err != nil {
		t.Fatalf("failed to insert test cart: %v", err)
	}

	item, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{MasterProductID: productID, Quantity: 3})
	if err != nil {
		t.Fatalf("UpsertItem failed: %v", err)
	}
	if item.UnitPriceMinorUnits != 2550 || item.Currency != "USD" || item.ProductName != "Test Widget" {
		t.Fatalf("unexpected cart snapshot: %#v", item)
	}
	validation, err := ValidateCart(ctx, db, cartID)
	if err != nil {
		t.Fatalf("ValidateCart failed: %v", err)
	}
	if !validation.Ready || validation.PriceChanged || len(validation.Items) != 1 || validation.Items[0].Status != "ready" {
		t.Fatalf("expected normalized DSH price/inventory to validate ready, got %#v", validation)
	}
	snapshot, err := ComputeCheckoutSnapshot(ctx, db, cartID)
	if err != nil {
		t.Fatalf("ComputeCheckoutSnapshot failed: %v", err)
	}
	if snapshot.AmountMinorUnits != 7650 || snapshot.Currency != "USD" || snapshot.SnapshotHash == "" {
		t.Fatalf("unexpected checkout snapshot: %#v", snapshot)
	}
	quoter := &captureWltQuoter{}
	loadedCart, err := GetCart(ctx, db, quoter, clientID, storeID)
	if err != nil {
		t.Fatalf("GetCart quote readback failed: %v", err)
	}
	if loadedCart.Quote == nil || loadedCart.Quote.Hash == "" || loadedCart.Quote.ExpiresAt == nil || quoter.input.CartSnapshotHash != snapshot.SnapshotHash {
		t.Fatalf("expected cart readback to pass canonical snapshot correlation to WLT, quote=%#v input=%#v snapshot=%#v", loadedCart.Quote, quoter.input, snapshot)
	}

	// Both callers confirm the same cart version. The row lock in UpsertItem
	// must serialize them so exactly one mutation is accepted and the other is
	// rejected after observing the committed version increment.
	start := make(chan struct{})
	results := make(chan error, 2)
	var group sync.WaitGroup
	for i := 0; i < 2; i++ {
		group.Add(1)
		go func() {
			defer group.Done()
			<-start
			_, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{
				MasterProductID: productID,
				Quantity:        4,
				ExpectedVersion: func() *int { value := 2; return &value }(),
			})
			results <- err
		}()
	}
	close(start)
	group.Wait()
	close(results)

	successes := 0
	conflicts := 0
	for err := range results {
		switch {
		case err == nil:
			successes++
		case errors.Is(err, ErrConflict):
			conflicts++
		default:
			t.Fatalf("concurrent upsert returned unexpected error: %v", err)
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatalf("expected one accepted mutation and one stale-version conflict, got successes=%d conflicts=%d", successes, conflicts)
	}
	failedMode := ModePartnerDelivery
	failedVersion := 3
	if _, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{
		MasterProductID: productID,
		Quantity:        999,
		ExpectedVersion: &failedVersion,
		FulfillmentMode: &failedMode,
	}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected invalid inventory mutation, got %v", err)
	}
	var modeAfterFailure string
	var versionAfterFailure int
	if err := db.QueryRowContext(ctx, `SELECT fulfillment_mode, version FROM dsh_carts WHERE id=$1::uuid`, cartID).Scan(&modeAfterFailure, &versionAfterFailure); err != nil {
		t.Fatalf("read cart after failed mode/item mutation: %v", err)
	}
	if modeAfterFailure != string(ModeBthwaniDelivery) || versionAfterFailure != 3 {
		t.Fatalf("failed item mutation left cart state behind: mode=%q version=%d", modeAfterFailure, versionAfterFailure)
	}
	if _, err := db.ExecContext(ctx, `UPDATE dsh_store_assortment_prices SET amount_minor=2600, version=version+1, updated_at=NOW() WHERE store_assortment_id=$1`, assortmentID); err != nil {
		t.Fatal(err)
	}
	validation, err = ValidateCart(ctx, db, cartID)
	if err != nil {
		t.Fatal(err)
	}
	if validation.Ready || !validation.PriceChanged || validation.Items[0].ReasonCode != "PRICE_CHANGED" {
		t.Fatalf("expected price change to invalidate cart, got %#v", validation)
	}
}

func TestCartMutationIdempotencyIsAtomicAndFingerprintBoundDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-idempotency-store-" + suffix
	clientID := "cart-idempotency-client-" + suffix
	domainID := "cart-idempotency-domain-" + suffix
	productID := "cart-idempotency-product-" + suffix
	assortmentID := "cart-idempotency-assortment-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Cart Idempotency Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true)`, storeID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_domains (id, slug, name_ar) VALUES ($1, $1, 'Cart Idempotency Domain')`, domainID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_master_products (id, domain_id, canonical_name_ar, approval_status, is_active)
		VALUES ($1, $2, 'Idempotency Product', 'approved', true)`, productID, domainID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_at) VALUES ($1, $2, 'approved', NOW())`, storeID, domainID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortments (id, store_id, master_product_id, publication_status)
		VALUES ($1, $2, $3, 'client_visible')`, assortmentID, storeID, productID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_store_assortment_prices (id, store_assortment_id, amount_minor, currency, effective_from) VALUES ($1, $2, 1000, 'YER', NOW())`, "idempotency-price-"+suffix, assortmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_inventory (store_assortment_id, policy_type, quantity, reserved_quantity, min_order_quantity, max_order_quantity, step_quantity)
		VALUES ($1, 'quantity', 100, 0, 1, 100, 1)`, assortmentID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_mutation_receipts WHERE client_id = $1`, clientID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id IN (SELECT id FROM dsh_carts WHERE client_id = $1)`, clientID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE client_id = $1`, clientID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE id = $1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id = $1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id = $1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})

	mutation := MutationContext{IdempotencyKey: "cart-add-" + suffix, CorrelationID: "cart-correlation-" + suffix}
	input := UpsertItemInput{MasterProductID: productID, Quantity: 3}
	start := make(chan struct{})
	results := make(chan *MutationResult, 2)
	errorsCh := make(chan error, 2)
	var group sync.WaitGroup
	for i := 0; i < 2; i++ {
		group.Add(1)
		go func() {
			defer group.Done()
			<-start
			result, err := UpsertItemIdempotent(ctx, db, clientID, storeID, ModeBthwaniDelivery, input, mutation)
			results <- result
			errorsCh <- err
		}()
	}
	close(start)
	group.Wait()
	close(results)
	close(errorsCh)

	replayed := 0
	for err := range errorsCh {
		if err != nil {
			t.Fatalf("same-key concurrent mutation failed: %v", err)
		}
	}
	for result := range results {
		if result == nil || result.Item == nil {
			t.Fatalf("same-key mutation returned incomplete result: %#v", result)
		}
		if result.Replayed {
			replayed++
		}
	}
	if replayed != 1 {
		t.Fatalf("expected exactly one replay after concurrent same-key mutation, got %d", replayed)
	}

	var cartCount, itemCount, receiptCount, cartVersion, quantity int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(MAX(version), 0) FROM dsh_carts WHERE client_id = $1`, clientID).Scan(&cartCount, &cartVersion); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(MAX(quantity), 0) FROM dsh_cart_items WHERE cart_id IN (SELECT id FROM dsh_carts WHERE client_id = $1)`, clientID).Scan(&itemCount, &quantity); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_cart_mutation_receipts WHERE client_id = $1 AND idempotency_key = $2`, clientID, mutation.IdempotencyKey).Scan(&receiptCount); err != nil {
		t.Fatal(err)
	}
	if cartCount != 1 || itemCount != 1 || quantity != 3 || cartVersion != 2 || receiptCount != 1 {
		t.Fatalf("same-key mutation was not single-commit: carts=%d items=%d quantity=%d cartVersion=%d receipts=%d", cartCount, itemCount, quantity, cartVersion, receiptCount)
	}

	changedInput := input
	changedInput.Quantity = 4
	if _, err := UpsertItemIdempotent(ctx, db, clientID, storeID, ModeBthwaniDelivery, changedInput, mutation); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("expected changed payload to be rejected as idempotency conflict, got %v", err)
	}
	if err := db.QueryRowContext(ctx, `SELECT version FROM dsh_carts WHERE client_id = $1`, clientID).Scan(&cartVersion); err != nil {
		t.Fatal(err)
	}
	if cartVersion != 2 {
		t.Fatalf("idempotency conflict changed cart version: %d", cartVersion)
	}

	removeMutation := MutationContext{IdempotencyKey: "cart-remove-" + suffix, CorrelationID: "cart-remove-correlation-" + suffix}
	var cartID, itemID string
	if err := db.QueryRowContext(ctx, `
		SELECT c.id::text, i.id::text FROM dsh_carts c JOIN dsh_cart_items i ON i.cart_id = c.id
		WHERE c.client_id = $1`, clientID).Scan(&cartID, &itemID); err != nil {
		t.Fatal(err)
	}
	if _, err := RemoveItemIdempotent(ctx, db, clientID, cartID, itemID, func() *int { value := 2; return &value }(), removeMutation); err != nil {
		t.Fatalf("remove mutation failed: %v", err)
	}
	removeReplay, err := RemoveItemIdempotent(ctx, db, clientID, cartID, itemID, func() *int { value := 2; return &value }(), removeMutation)
	if err != nil || removeReplay == nil || !removeReplay.Replayed {
		t.Fatalf("remove replay did not return committed receipt: result=%#v err=%v", removeReplay, err)
	}
	var itemReceiptID sql.NullString
	if err := db.QueryRowContext(ctx, `SELECT item_id::text FROM dsh_cart_mutation_receipts WHERE client_id = $1 AND idempotency_key = $2`, clientID, removeMutation.IdempotencyKey).Scan(&itemReceiptID); err != nil {
		t.Fatal(err)
	}
	if itemReceiptID.Valid {
		t.Fatalf("deleted item remained in mutation receipt FK: %s", itemReceiptID.String)
	}
}

func TestFindMutationReceiptHidesHistoricalMigrationRowsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	clientID := "cart-historical-receipt-client-" + suffix
	idempotencyKey := "cart-historical-key-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_mutation_receipts (
			client_id, idempotency_key, operation, request_fingerprint,
			correlation_id, result_version, result_deleted, result_json
		) VALUES ($1, $2, 'historical', repeat('a', 64), $3, 1, false, '{}'::jsonb)
	`, clientID, idempotencyKey, "cart-historical-correlation-"+suffix); err != nil {
		t.Fatalf("failed to insert historical receipt fixture: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_mutation_receipts WHERE client_id = $1`, clientID)
	})

	if _, err := FindMutationReceipt(ctx, db, clientID, idempotencyKey); !errors.Is(err, ErrMutationReceiptNotFound) {
		t.Fatalf("historical receipt was exposed as a client commit: %v", err)
	}
}

func TestUpsertItemRejectsPublicationApprovalAndInventoryPolicyViolationsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-policy-store-" + suffix
	clientID := "cart-policy-client-" + suffix
	domainID := "cart-policy-domain-" + suffix
	productID := "cart-policy-product-" + suffix
	assortmentID := "cart-policy-assortment-" + suffix

	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_stores (id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES ($1,$1,'Cart Policy Test Store','published','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_domains (id,slug,name_ar) VALUES ($1,$1,'Policy Domain')`, domainID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_master_products (id,domain_id,canonical_name_ar,approval_status,is_active) VALUES ($1,$2,'Policy Product','approved',true)`, productID, domainID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_store_catalog_domains (store_id,domain_id,status,approved_at) VALUES ($1,$2,'approved',NOW())`, storeID, domainID); err != nil {
		t.Fatalf("failed to approve policy test store domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_store_assortments (id,store_id,master_product_id,publication_status) VALUES ($1,$2,$3,'hidden')`, assortmentID, storeID, productID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_store_assortment_prices (id,store_assortment_id,amount_minor,currency,effective_from) VALUES ($1,$2,1000,'YER',NOW())`, "policy-price-"+suffix, assortmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_store_assortment_inventory (store_assortment_id,policy_type,quantity,reserved_quantity,min_order_quantity,max_order_quantity,step_quantity) VALUES ($1,'quantity',10,0,2,6,2)`, assortmentID); err != nil {
		t.Fatal(err)
	}
	var cartID string
	if err := db.QueryRowContext(ctx, `INSERT INTO dsh_carts (client_id,store_id,fulfillment_mode,state) VALUES ($1,$2,'bthwani_delivery','active') RETURNING id::text`, clientID, storeID).Scan(&cartID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id=$1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE id=$1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE id=$1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id=$1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id=$1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id=$1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	assertInvalid := func(quantity int, label string) {
		t.Helper()
		_, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{MasterProductID: productID, Quantity: quantity})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("%s: expected ErrInvalid, got %v", label, err)
		}
	}
	assertInvalid(2, "hidden assortment")
	if _, err := db.ExecContext(ctx, `UPDATE dsh_store_assortments SET publication_status='client_visible' WHERE id=$1`, assortmentID); err != nil {
		t.Fatal(err)
	}
	assertInvalid(1, "below minimum quantity")
	assertInvalid(3, "off-step quantity")
	assertInvalid(8, "above maximum quantity")
	item, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{MasterProductID: productID, Quantity: 6})
	if err != nil || item == nil || item.Quantity != 6 {
		t.Fatalf("valid policy quantity should succeed, item=%#v err=%v", item, err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE dsh_store_assortment_inventory SET quantity=0 WHERE store_assortment_id=$1`, assortmentID); err != nil {
		t.Fatal(err)
	}
	assertInvalid(2, "assortment unavailable")
	if _, err := db.ExecContext(ctx, `UPDATE dsh_store_assortment_inventory SET quantity=10 WHERE store_assortment_id=$1`, assortmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE dsh_master_products SET approval_status='rejected' WHERE id=$1`, productID); err != nil {
		t.Fatal(err)
	}
	assertInvalid(2, "master product rejected")
}

func TestComputeCheckoutSnapshotRejectsUnpricedItemDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-price-test-store-unpriced-" + suffix
	clientID := "cart-price-test-client-unpriced-" + suffix
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_stores (id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES ($1,$1,'Cart Price Test Store Unpriced','published','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id IN (SELECT id FROM dsh_carts WHERE store_id=$1)`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE store_id=$1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})
	var cartID string
	if err := db.QueryRowContext(ctx, `INSERT INTO dsh_carts (client_id,store_id,fulfillment_mode,state) VALUES ($1,$2,'bthwani_delivery','active') RETURNING id::text`, clientID, storeID).Scan(&cartID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_cart_items (cart_id,product_id,master_product_id,product_name,price_reference,unit_price_minor,currency,quantity) VALUES ($1,'unpriced-product','unpriced-product','Unpriced Product','n/a',0,'USD',1)`, cartID); err != nil {
		t.Fatal(err)
	}
	_, err := ComputeCheckoutSnapshot(ctx, db, cartID)
	if !errors.Is(err, ErrCartItemMissingPrice) {
		t.Fatalf("expected ErrCartItemMissingPrice, got %v", err)
	}
}

func TestComputeCheckoutSnapshotRejectsMixedCurrenciesDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-currency-test-store-" + suffix
	clientID := "cart-currency-test-client-" + suffix
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_stores (id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES ($1,$1,'Cart Currency Test Store','published','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id IN (SELECT id FROM dsh_carts WHERE store_id=$1)`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE store_id=$1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})
	var cartID string
	if err := db.QueryRowContext(ctx, `INSERT INTO dsh_carts (client_id,store_id,fulfillment_mode,state) VALUES ($1,$2,'pickup','active') RETURNING id::text`, clientID, storeID).Scan(&cartID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_cart_items (cart_id,product_id,master_product_id,product_name,price_reference,unit_price_minor,currency,quantity) VALUES ($1,'product-usd','product-usd','USD Product','10.00',1000,'USD',1),($1,'product-eur','product-eur','EUR Product','12.00',1200,'EUR',1)`, cartID); err != nil {
		t.Fatal(err)
	}
	_, err := ComputeCheckoutSnapshot(ctx, db, cartID)
	if !errors.Is(err, ErrCartItemCurrency) {
		t.Fatalf("expected ErrCartItemCurrency, got %v", err)
	}
}

func TestCheckServiceabilityUsesCanonicalServiceAreaEvidenceDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	seed := time.Now().UnixNano()
	suffix := strconv.FormatInt(seed, 10)
	storeID := "cart-service-area-store-" + suffix
	serviceAreaCode := "integration-area-" + suffix
	baseLng := -170.0 + float64(seed%30000)/100
	baseLat := -80.0 + float64((seed/30000)%15000)/100
	if _, err := servicearea.Upsert(ctx, db, serviceAreaCode, servicearea.UpsertInput{
		DisplayName:    "Cart Service Area Test",
		Polygon:        [][]float64{{baseLng, baseLat}, {baseLng + 0.2, baseLat}, {baseLng + 0.2, baseLat + 0.2}, {baseLng, baseLat + 0.2}},
		Active:         true,
		Priority:       100,
		SRID:           4326,
		OverlapPolicy:  "priority_then_code",
		Reason:         "cart serviceability integration fixture",
		ActorID:        "operator-cart-service-area-" + suffix,
		ActorSurface:   "test",
		IdempotencyKey: "cart-service-area-create-" + suffix,
		CorrelationID:  "cart-service-area-correlation-" + suffix,
	}); err != nil {
		t.Fatalf("failed to create service-area test fixture: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores
			(id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, delivery_modes)
		VALUES ($1, $1, 'Cart Service Area Test Store', 'published', 'not-authoritative', $2, 'serviceable', true,
			ARRAY['delivery', 'pickup']::text[])`, storeID, serviceAreaCode); err != nil {
		t.Fatalf("failed to insert service-area test store: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})

	insideLat, insideLng := baseLat+0.1, baseLng+0.1
	result, err := CheckServiceability(ctx, db, storeID, serviceAreaCode, &insideLat, &insideLng)
	if err != nil {
		t.Fatalf("inside geofence check failed: %v", err)
	}
	if !result.Serviceable || result.Code != "serviceable" {
		t.Fatalf("expected canonical geofence to make delivery serviceable, got %+v", result)
	}
	if got := availabilityFor(result.AvailableModes, ModePartnerDelivery); !got.Available {
		t.Fatalf("expected delivery mode available inside canonical geofence, got %+v", got)
	}

	outLat, outLng := baseLat+0.4, baseLng+0.1
	result, err = CheckServiceability(ctx, db, storeID, serviceAreaCode, &outLat, &outLng)
	if err != nil {
		t.Fatalf("outside geofence check failed: %v", err)
	}
	if result.Serviceable || result.Code != "out_of_area" {
		t.Fatalf("expected outside canonical geofence to fail closed, got %+v", result)
	}
	if got := availabilityFor(result.AvailableModes, ModePartnerDelivery); got.Available || got.UnavailableReasonCode != "out_of_area" {
		t.Fatalf("expected delivery mode out_of_area, got %+v", got)
	}
	if got := availabilityFor(result.AvailableModes, ModePickup); !got.Available {
		t.Fatalf("expected pickup to remain independent of delivery coverage, got %+v", got)
	}

	result, err = CheckServiceability(ctx, db, storeID, serviceAreaCode, nil, nil)
	if err != nil {
		t.Fatalf("missing coordinate check failed: %v", err)
	}
	if result.Serviceable || result.Code != "policy_unavailable" {
		t.Fatalf("expected missing coordinates to remain unknown/fail closed, got %+v", result)
	}
	if got := availabilityFor(result.AvailableModes, ModePartnerDelivery); got.Available || got.UnavailableReasonCode != "policy_unavailable" {
		t.Fatalf("expected delivery mode policy_unavailable without coordinates, got %+v", got)
	}
	if got := availabilityFor(result.AvailableModes, ModePickup); !got.Available {
		t.Fatalf("expected pickup without coordinates, got %+v", got)
	}
}
