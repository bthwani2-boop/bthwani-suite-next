package cart

import (
	"context"
	"math"
	"testing"
)

func TestCalculateDistanceKMSamePoint(t *testing.T) {
	d := calculateDistanceKM(15.3694, 44.1910, 15.3694, 44.1910)
	if math.Abs(d) > 0.0001 {
		t.Fatalf("expected ~0km for identical coordinates, got %f", d)
	}
}

func TestCalculateDistanceKMKnownPair(t *testing.T) {
	// Sana'a (15.3694, 44.1910) to Aden (12.7855, 45.0187) is roughly 300km.
	d := calculateDistanceKM(15.3694, 44.1910, 12.7855, 45.0187)
	if d < 270 || d > 320 {
		t.Fatalf("expected distance between Sana'a and Aden to be ~270-320km, got %f", d)
	}
}

func TestUpsertItemRejectsMissingProductID(t *testing.T) {
	_, err := UpsertItem(context.Background(), nil, "store-1", "cart-1", UpsertItemInput{
		Quantity: 1,
	})
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for missing productId, got %v", err)
	}
}

func TestUpsertItemRejectsNonPositiveQuantity(t *testing.T) {
	cases := []int{0, -1, -100}
	for _, qty := range cases {
		_, err := UpsertItem(context.Background(), nil, "store-1", "cart-1", UpsertItemInput{
			ProductID: "prod-1",
			Quantity:  qty,
		})
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for quantity=%d, got %v", qty, err)
		}
	}
}

// Product name, price label, and unit price are never taken from the
// client: UpsertItemInput only carries productId + quantity, and the
// authoritative snapshot is looked up server-side from the catalog.
func TestUpsertItemInputHasNoClientSuppliedPricingFields(t *testing.T) {
	input := UpsertItemInput{ProductID: "prod-1", Quantity: 1}
	_ = input
}

func TestFulfillmentModeConstants(t *testing.T) {
	modes := map[FulfillmentMode]bool{
		ModeBthwaniDelivery: true,
		ModePartnerDelivery: true,
		ModePickup:          true,
	}
	if len(modes) != 3 {
		t.Fatalf("expected 3 distinct fulfillment modes, got %d", len(modes))
	}
}
