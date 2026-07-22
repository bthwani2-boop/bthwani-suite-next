package settlement

import (
	"errors"
	"testing"
	"time"
)

func validJRN036SettlementInput() CreateEvidenceSettlementInput {
	return CreateEvidenceSettlementInput{
		PartnerID:      "partner-1",
		PeriodStart:    "2026-07-01",
		PeriodEnd:      "2026-07-07",
		OperatorID:     "operator-1",
		IdempotencyKey: "settlement:partner-1:2026-07-01:2026-07-07",
		OrderSources: []VerifiedDeliveredOrderSource{
			{
				OrderID:                "order-2",
				GrossAmountMinorUnits:  20000,
				Currency:               "YER",
				DeliveredAt:            time.Date(2026, 7, 4, 12, 0, 0, 0, time.UTC),
				PricingSnapshotHash:    "price-hash-2",
				CompletionEventID:      "delivered:order-2",
				CompletionEvidenceHash: "completion-hash-2",
				CancellationStatus:     "not_cancelled",
			},
			{
				OrderID:                "order-1",
				GrossAmountMinorUnits:  10000,
				Currency:               "YER",
				DeliveredAt:            time.Date(2026, 7, 2, 12, 0, 0, 0, time.UTC),
				PricingSnapshotHash:    "price-hash-1",
				CompletionEventID:      "delivered:order-1",
				CompletionEvidenceHash: "completion-hash-1",
				CancellationStatus:     "not_cancelled",
			},
		},
	}
}

func TestJRN036SettlementEvidenceIsRequiredAndSorted(t *testing.T) {
	input, _, _, err := normalizeEvidenceSettlementInput(validJRN036SettlementInput())
	if err != nil {
		t.Fatalf("normalize settlement: %v", err)
	}
	if input.OrderSources[0].OrderID != "order-1" || input.OrderSources[1].OrderID != "order-2" {
		t.Fatalf("order sources are not deterministically sorted: %#v", input.OrderSources)
	}
}

func TestJRN036SettlementRejectsCancellation(t *testing.T) {
	input := validJRN036SettlementInput()
	input.OrderSources[0].CancellationStatus = "cancelled"
	_, _, _, err := normalizeEvidenceSettlementInput(input)
	if !errors.Is(err, ErrSettlementEvidenceRequired) {
		t.Fatalf("err=%v want evidence required", err)
	}
}

func TestJRN036SettlementRejectsMissingPricingOrCompletionEvidence(t *testing.T) {
	for _, mutate := range []func(*VerifiedDeliveredOrderSource){
		func(source *VerifiedDeliveredOrderSource) { source.PricingSnapshotHash = "" },
		func(source *VerifiedDeliveredOrderSource) { source.CompletionEventID = "" },
		func(source *VerifiedDeliveredOrderSource) { source.CompletionEvidenceHash = "" },
	} {
		input := validJRN036SettlementInput()
		mutate(&input.OrderSources[0])
		_, _, _, err := normalizeEvidenceSettlementInput(input)
		if !errors.Is(err, ErrSettlementEvidenceRequired) {
			t.Fatalf("err=%v want evidence required", err)
		}
	}
}

func TestJRN036SettlementRejectsDuplicateOrders(t *testing.T) {
	input := validJRN036SettlementInput()
	input.OrderSources[1].OrderID = input.OrderSources[0].OrderID
	_, _, _, err := normalizeEvidenceSettlementInput(input)
	if err == nil {
		t.Fatal("expected duplicate order validation error")
	}
}

func TestJRN036SettlementFeeRoundingRemainsDeterministic(t *testing.T) {
	fee, err := settlementFeeFromBasisPoints(10001, 250)
	if err != nil {
		t.Fatalf("calculate fee: %v", err)
	}
	if fee != 250 {
		t.Fatalf("fee=%d want=250", fee)
	}
}
