package checkout

import (
	"context"
	"testing"
)

func TestUpsertDeliveryPricingUpdatesExistingPolicyDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	storeID := seedStore(t, db)
	fulfillmentMode := string(ModeBthwaniDelivery)
	actorID := uniqueID("delivery-pricing-actor")

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_delivery_pricing_audit WHERE store_id=$1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_delivery_pricing WHERE store_id=$1`, storeID)
	})

	initialConfig := `{"strategy":"flat","baseFeeMinorUnits":1500}`
	created, err := UpsertDeliveryPricing(ctx, db, storeID, fulfillmentMode, UpsertDeliveryPricingInput{
		PricingMode:     "bthwani_pricing",
		FeeMinorUnits:   1500,
		Currency:        "YER",
		PricingConfig:   initialConfig,
		Status:          "active",
		PricingSource:   "control_panel",
		ExpectedVersion: 0,
		ActorID:         actorID,
		ActorSurface:    "control-panel",
		Reason:          "integration create",
		CorrelationID:   uniqueID("delivery-pricing-create"),
	})
	if err != nil {
		t.Fatalf("create delivery pricing: %v", err)
	}
	if created.PricingMode != "bthwani_pricing" || created.PricingConfig == "" || created.Version <= 0 {
		t.Fatalf("unexpected create readback: %+v", created)
	}

	updatedConfig := `{"strategy":"zone","zones":{"SAN-1":2400}}`
	updated, err := UpsertDeliveryPricing(ctx, db, storeID, fulfillmentMode, UpsertDeliveryPricingInput{
		PricingMode:     "zone_pricing",
		FeeMinorUnits:   2400,
		Currency:        "YER",
		PricingConfig:   updatedConfig,
		Status:          "active",
		PricingSource:   "control_panel",
		ExpectedVersion: created.Version,
		ActorID:         actorID,
		ActorSurface:    "control-panel",
		Reason:          "integration update",
		CorrelationID:   uniqueID("delivery-pricing-update"),
	})
	if err != nil {
		t.Fatalf("update existing delivery pricing: %v", err)
	}
	if updated.Version != created.Version+1 {
		t.Fatalf("expected version %d, got %d", created.Version+1, updated.Version)
	}
	if updated.PricingMode != "zone_pricing" || updated.FeeMinorUnits != 2400 || updated.PricingConfig == "" {
		t.Fatalf("unexpected update readback: %+v", updated)
	}

	persisted, err := GetDeliveryPricing(db, storeID, fulfillmentMode)
	if err != nil {
		t.Fatalf("read updated delivery pricing: %v", err)
	}
	if persisted.PricingMode != updated.PricingMode || persisted.FeeMinorUnits != updated.FeeMinorUnits || persisted.PricingConfig != updated.PricingConfig || persisted.Version != updated.Version {
		t.Fatalf("persisted delivery pricing drifted: updated=%+v persisted=%+v", updated, persisted)
	}

	var auditMatches bool
	if err := db.QueryRowContext(ctx, `
		SELECT from_pricing_mode=$3
		   AND to_pricing_mode=$4
		   AND from_pricing_config=$5::jsonb
		   AND to_pricing_config=$6::jsonb
		   AND from_fee_minor_units=$7
		   AND to_fee_minor_units=$8
		FROM dsh_store_delivery_pricing_audit
		WHERE store_id=$1 AND fulfillment_mode=$2 AND action='update'
		ORDER BY created_at DESC
		LIMIT 1`,
		storeID,
		fulfillmentMode,
		"bthwani_pricing",
		"zone_pricing",
		initialConfig,
		updatedConfig,
		int64(1500),
		int64(2400),
	).Scan(&auditMatches); err != nil {
		t.Fatalf("read delivery pricing audit: %v", err)
	}
	if !auditMatches {
		t.Fatal("delivery pricing audit did not preserve pricing mode/config/fee transition")
	}
}
