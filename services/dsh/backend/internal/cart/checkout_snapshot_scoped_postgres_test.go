package cart

import (
	"context"
	"strconv"
	"testing"
	"time"
)

func TestComputeCheckoutSnapshotForClientTxUsesMinorUnitSnapshotDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "checkout-minor-store-" + suffix
	clientID := "checkout-minor-client-" + suffix
	operatorContextID := "checkout-minor-context-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, operator_context_id
		) VALUES ($1,$1,'Checkout Minor Unit Store','published','SAN','SAN-1','serviceable',true,$2)`,
		storeID, operatorContextID); err != nil {
		t.Fatalf("insert governed store: %v", err)
	}

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1,$2,'bthwani_delivery','active')
		RETURNING id::text`, clientID, storeID).Scan(&cartID); err != nil {
		t.Fatalf("insert cart: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_items (
			cart_id, product_id, master_product_id, product_name, price_reference,
			unit_price, unit_price_minor, currency, quantity
		) VALUES ($1::uuid,'minor-product','minor-product','Minor Unit Product','catalog',0,2550,'USD',2)`, cartID); err != nil {
		t.Fatalf("insert minor-unit cart item: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id=$1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE id=$1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin checkout snapshot transaction: %v", err)
	}
	defer tx.Rollback()

	snapshot, err := ComputeCheckoutSnapshotForClientTx(ctx, tx, cartID, clientID, storeID)
	if err != nil {
		t.Fatalf("minor-unit checkout snapshot failed: %v", err)
	}
	if snapshot.AmountMinorUnits != 5100 {
		t.Fatalf("expected subtotal 5100 minor units, got %d", snapshot.AmountMinorUnits)
	}
	if snapshot.Currency != "USD" {
		t.Fatalf("expected USD snapshot currency, got %q", snapshot.Currency)
	}
	if snapshot.SnapshotHash == "" {
		t.Fatal("expected non-empty checkout snapshot hash")
	}
}
