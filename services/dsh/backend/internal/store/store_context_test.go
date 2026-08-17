package store

import (
	"testing"
	"time"
)

func eligibleStoreRow() DshStoreRow {
	logoURL := "https://media.example/store/logo.webp"
	heroURL := "https://media.example/store/cover.webp"
	return DshStoreRow{
		ID:                      "store-",
		PartnerID:               "partner-storefront-ready",
		PartnerActivationStatus: "client_visible",
		HasApprovedAssortment:   true,
		Slug:                    "store-",
		DisplayName:             "متجر الرحلة الرابعة",
		Status:                  StatusPublished,
		CityCode:                "sana",
		ServiceAreaCode:         "haddah",
		ServiceabilityStatus:    ServiceabilityServiceable,
		IsVisible:               true,
		HeroImageURL:            &heroURL,
		LogoURL:                 &logoURL,
		Category:                CategoryGrocery,
		CategoryLabel:           "بقالة",
		DeliveryModes:           []string{"delivery", "pickup"},
		PartnerReadiness:        "ready",
		CatalogApprovalStatus:   "approved",
		MarketingVisibility:     "visible",
		AddressLine:             "شارع حدة",
		CoverageSummary:         "حدة والمناطق المجاورة",
		OperatingHours:          "08:00-23:00",
		DeliveryReadiness:       "ready",
		PublicationDecision:     PublicationPublished,
		BlockingReasonCodes:     []string{},
		Version:                 3,
		CreatedAt:               time.Date(2026, 7, 21, 8, 0, 0, 0, time.UTC),
		UpdatedAt:               time.Date(2026, 7, 21, 9, 0, 0, 0, time.UTC),
	}
}

func TestRowToDetailExposesOperationalContext(t *testing.T) {
	detail := RowToDetail(eligibleStoreRow())
	if detail.AddressLine != "شارع حدة" {
		t.Fatalf("expected address readback, got %q", detail.AddressLine)
	}
	if detail.CoverageSummary != "حدة والمناطق المجاورة" {
		t.Fatalf("expected coverage readback, got %q", detail.CoverageSummary)
	}
	if detail.OperatingHours != "08:00-23:00" {
		t.Fatalf("expected operating hours readback, got %q", detail.OperatingHours)
	}
	if detail.DeliveryReadiness != "ready" {
		t.Fatalf("expected delivery readiness readback, got %q", detail.DeliveryReadiness)
	}
	if detail.PublicationDecision != PublicationPublished || len(detail.BlockingReasons) != 0 {
		t.Fatalf("expected fully governed store to be published, got decision=%s reasons=%v", detail.PublicationDecision, detail.BlockingReasons)
	}
}

func TestPublicationEligibilityFailsClosedForEveryGovernanceGate(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*DshStoreRow)
	}{
		{name: "not published", mutate: func(row *DshStoreRow) {
			row.PublicationDecision = PublicationBlocked
			row.BlockingReasonCodes = []string{"STORE_NOT_PUBLISHED"}
		}},
		{name: "missing canonical blocker", mutate: func(row *DshStoreRow) {
			row.PublicationDecision = PublicationBlocked
			row.BlockingReasonCodes = []string{}
		}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			row := eligibleStoreRow()
			tc.mutate(&row)
			if DiagnoseStorePublication(row).IsReady {
				t.Fatalf("publication must fail closed when %s", tc.name)
			}
		})
	}
}
