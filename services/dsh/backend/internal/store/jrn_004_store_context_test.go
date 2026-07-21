package store

import (
	"testing"
	"time"
)

func eligibleStoreRow() DshStoreRow {
	logoURL := "https://media.example/store/logo.webp"
	heroURL := "https://media.example/store/cover.webp"
	return DshStoreRow{
		ID:                    "store-jrn-004",
		Slug:                  "store-jrn-004",
		DisplayName:           "متجر الرحلة الرابعة",
		Status:                StatusActive,
		CityCode:              "sana",
		ServiceAreaCode:       "haddah",
		ServiceabilityStatus:  ServiceabilityServiceable,
		IsVisible:             true,
		HeroImageURL:          &heroURL,
		LogoURL:               &logoURL,
		Category:              CategoryGrocery,
		CategoryLabel:         "بقالة",
		DeliveryModes:         []string{"delivery", "pickup"},
		PartnerReadiness:      "ready",
		CatalogApprovalStatus: "approved",
		MarketingVisibility:   "visible",
		AddressLine:           "شارع حدة",
		CoverageSummary:       "حدة والمناطق المجاورة",
		OperatingHours:        "08:00-23:00",
		DeliveryReadiness:     "ready",
		Version:               3,
		CreatedAt:             time.Date(2026, 7, 21, 8, 0, 0, 0, time.UTC),
		UpdatedAt:             time.Date(2026, 7, 21, 9, 0, 0, 0, time.UTC),
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
	if !detail.PublicationEligible {
		t.Fatal("expected fully governed store to be publication eligible")
	}
}

func TestPublicationEligibilityFailsClosedForEveryGovernanceGate(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*DshStoreRow)
	}{
		{name: "inactive", mutate: func(row *DshStoreRow) { row.Status = StatusInactive }},
		{name: "hidden", mutate: func(row *DshStoreRow) { row.IsVisible = false }},
		{name: "out of area", mutate: func(row *DshStoreRow) { row.ServiceabilityStatus = ServiceabilityOutOfArea }},
		{name: "partner blocked", mutate: func(row *DshStoreRow) { row.PartnerReadiness = "blocked" }},
		{name: "catalog draft", mutate: func(row *DshStoreRow) { row.CatalogApprovalStatus = "draft" }},
		{name: "marketing hidden", mutate: func(row *DshStoreRow) { row.MarketingVisibility = "hidden" }},
		{name: "delivery modes missing", mutate: func(row *DshStoreRow) { row.DeliveryModes = nil }},
		{name: "address missing", mutate: func(row *DshStoreRow) { row.AddressLine = "" }},
		{name: "coverage missing", mutate: func(row *DshStoreRow) { row.CoverageSummary = "" }},
		{name: "operating hours missing", mutate: func(row *DshStoreRow) { row.OperatingHours = "" }},
		{name: "delivery not ready", mutate: func(row *DshStoreRow) { row.DeliveryReadiness = "blocked" }},
		{name: "logo missing", mutate: func(row *DshStoreRow) { row.LogoURL = nil }},
		{name: "cover missing", mutate: func(row *DshStoreRow) { row.HeroImageURL = nil }},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			row := eligibleStoreRow()
			tc.mutate(&row)
			if IsPublicationEligible(row) {
				t.Fatalf("publication must fail closed when %s", tc.name)
			}
		})
	}
}
