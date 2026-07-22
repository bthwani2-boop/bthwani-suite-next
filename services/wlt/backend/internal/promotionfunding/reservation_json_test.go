package promotionfunding

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestReservationJSONHidesInternalMutationMetadata(t *testing.T) {
	t.Parallel()
	partnerID := "partner-1"
	orderID := "order-1"
	payload, err := json.Marshal(Reservation{
		ID: "pfr_123", TenantID: "tenant-1", ExternalReference: "dsh:redemption-1",
		CheckoutIntentID: "checkout-1", CouponRedemptionID: "redemption-1",
		CouponID: "coupon-1", ClientID: "client-1", PartnerID: &partnerID,
		PlatformFundedMinorUnits: 600, PartnerFundedMinorUnits: 400,
		TotalDiscountMinorUnits: 1000, Currency: "YER", Status: "committed",
		OrderID: &orderID, IdempotencyKey: "secret-idempotency-key",
		CorrelationID: "internal-correlation", ReleaseReason: "internal-release",
		ReversalReason: "internal-reversal", CreatedAt: "2026-07-22T00:00:00Z",
		UpdatedAt: "2026-07-22T00:01:00Z",
	})
	if err != nil {
		t.Fatalf("marshal reservation: %v", err)
	}
	encoded := string(payload)
	for _, forbidden := range []string{
		"idempotencyKey", "secret-idempotency-key", "correlationId",
		"internal-correlation", "releaseReason", "reversalReason",
	} {
		if strings.Contains(encoded, forbidden) {
			t.Fatalf("governed response leaked %q: %s", forbidden, encoded)
		}
	}
	for _, required := range []string{
		`"id":"pfr_123"`, `"tenantId":"tenant-1"`,
		`"platformFundedMinorUnits":600`, `"status":"committed"`,
	} {
		if !strings.Contains(encoded, required) {
			t.Fatalf("governed response is missing %q: %s", required, encoded)
		}
	}
}
