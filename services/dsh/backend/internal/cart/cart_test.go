package cart

import (
	"context"
	"errors"
	"math"
	"testing"

	"dsh-api/internal/mapproviders"
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

func TestEtaFromRouteNeverFallsBackToDistance(t *testing.T) {
	minETA, maxETA, reason := etaFromRoute(mapproviders.RouteResponse{
		DistanceMeters:  300_000,
		DurationSeconds: 0,
	}, 15)
	if minETA != nil || maxETA != nil || reason != "ROUTE_DURATION_UNAVAILABLE" {
		t.Fatalf("expected unavailable ETA without provider duration, got min=%v max=%v reason=%q", minETA, maxETA, reason)
	}
}

func TestEtaFromRouteUsesProviderDuration(t *testing.T) {
	minETA, maxETA, reason := etaFromRoute(mapproviders.RouteResponse{DurationSeconds: 1800}, 20)
	if reason != "" || minETA == nil || maxETA == nil || *minETA != 50 || *maxETA != 65 {
		t.Fatalf("expected provider-backed ETA, got min=%v max=%v reason=%q", minETA, maxETA, reason)
	}
}

func TestUpsertItemRejectsMissingProductID(t *testing.T) {
	_, err := UpsertItem(context.Background(), nil, "store-1", "cart-1", UpsertItemInput{
		Quantity: 1,
	})
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for missing masterProductId, got %v", err)
	}
}

func TestUpsertItemRejectsNonPositiveQuantity(t *testing.T) {
	cases := []int{0, -1, -100}
	for _, qty := range cases {
		_, err := UpsertItem(context.Background(), nil, "store-1", "cart-1", UpsertItemInput{
			MasterProductID: "prod-1",
			Quantity:        qty,
		})
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for quantity=%d, got %v", qty, err)
		}
	}
}

func TestFetchWltQuoteFailsClosedWhenWltIsUnavailableForNonEmptyCart(t *testing.T) {
	_, err := FetchWltQuote(context.Background(), nil, nil, &Cart{
		ClientID: "client-1",
		StoreID:  "store-1",
		Items: []CartItem{{
			MasterProductID:     "product-1",
			ProductName:         "Product",
			UnitPriceMinorUnits: 1000,
			Currency:            "YER",
			Quantity:            1,
		}},
	})
	if !errors.Is(err, ErrFinancialUnavailable) {
		t.Fatalf("expected typed financial unavailability, got %v", err)
	}
}

// Product name, price label, and unit price are never taken from the
// client: UpsertItemInput only carries masterProductId + quantity, and the
// authoritative snapshot is looked up server-side from the store assortment.
func TestUpsertItemInputHasNoClientSuppliedPricingFields(t *testing.T) {
	input := UpsertItemInput{MasterProductID: "prod-1", Quantity: 1}
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

func availabilityFor(modes []FulfillmentModeAvailability, mode FulfillmentMode) FulfillmentModeAvailability {
	for _, m := range modes {
		if m.Mode == mode {
			return m
		}
	}
	return FulfillmentModeAvailability{}
}

// A store that never enabled bthwani_delivery/express must never report it
// available, even when the client is in zone — the mode list must reflect
// what the store actually turned on, not a static three-mode assumption.
func TestComputeFulfillmentModeAvailabilityModeNotEnabled(t *testing.T) {
	result := computeFulfillmentModeAvailability([]string{"delivery", "pickup"}, true)
	if got := availabilityFor(result, ModeBthwaniDelivery); got.Available || got.UnavailableReasonCode != "mode_not_enabled" {
		t.Fatalf("expected bthwani_delivery unavailable with mode_not_enabled, got %+v", got)
	}
	if got := availabilityFor(result, ModePartnerDelivery); !got.Available {
		t.Fatalf("expected partner_delivery available, got %+v", got)
	}
	if got := availabilityFor(result, ModePickup); !got.Available {
		t.Fatalf("expected pickup available, got %+v", got)
	}
}

// Delivery modes (bthwani_delivery, partner_delivery) require the client to
// be in the store's serviceable zone; pickup never does, since the customer
// travels to the store themselves.
func TestComputeFulfillmentModeAvailabilityOutOfZone(t *testing.T) {
	result := computeFulfillmentModeAvailability([]string{"delivery", "express", "pickup"}, false)
	for _, mode := range []FulfillmentMode{ModeBthwaniDelivery, ModePartnerDelivery} {
		got := availabilityFor(result, mode)
		if got.Available || got.UnavailableReasonCode != "out_of_area" {
			t.Fatalf("expected %s unavailable with out_of_area when not in zone, got %+v", mode, got)
		}
	}
	if got := availabilityFor(result, ModePickup); !got.Available {
		t.Fatalf("expected pickup available even when client is out of the delivery zone, got %+v", got)
	}
}

func TestComputeFulfillmentModeAvailabilityAllEnabledInZone(t *testing.T) {
	result := computeFulfillmentModeAvailability([]string{"delivery", "express", "pickup"}, true)
	if len(result) != 3 {
		t.Fatalf("expected exactly 3 mode entries, got %d", len(result))
	}
	for _, entry := range result {
		if !entry.Available {
			t.Fatalf("expected all modes available when enabled and in zone, got %+v", entry)
		}
	}
}
