package store

import (
	"testing"
	"time"
)

func TestRowToSummary(t *testing.T) {
	rating := 4.8
	etaMin := 20
	etaMax := 40
	hero := "http://localhost:59000/dsh-media/hero.png"
	logo := "http://localhost:59000/dsh-media/logo.png"

	row := DshStoreRow{
		ID:                   "store-001",
		Slug:                 "test-store",
		DisplayName:          "Test Store",
		Status:               StatusActive,
		CityCode:             "sana",
		ServiceAreaCode:      "haddah",
		ServiceabilityStatus: ServiceabilityServiceable,
		RatingAverage:        &rating,
		RatingCount:          200,
		DeliveryEtaMin:       &etaMin,
		DeliveryEtaMax:       &etaMax,
		IsVisible:            true,
		HeroImageURL:         &hero,
		LogoURL:              &logo,
		Category:             CategoryGrocery,
		DeliveryModes:        []string{"delivery", "pickup"},
		IsFreeDelivery:       true,
		DistanceKM:           ptrFloat(2.1),
		FollowerCount:        3100,
		HasProBadge:          true,
		PointsMultiplier:     ptrInt(2),
		IsPopular:            true,
		CreatedAt:            time.Date(2026, 6, 21, 10, 0, 0, 0, time.UTC),
		UpdatedAt:            time.Date(2026, 6, 21, 11, 0, 0, 0, time.UTC),
	}

	summary := RowToSummary(row)

	if summary.ID != "store-001" {
		t.Errorf("expected ID 'store-001', got '%s'", summary.ID)
	}
	if summary.RatingAverage == nil || *summary.RatingAverage != 4.8 {
		t.Errorf("expected RatingAverage 4.8, got %v", summary.RatingAverage)
	}
	if summary.Serviceability.Status != ServiceabilityServiceable {
		t.Errorf("expected serviceability status 'serviceable', got '%s'", summary.Serviceability.Status)
	}
	if summary.Category != CategoryGrocery || len(summary.DeliveryModes) != 2 {
		t.Errorf("expected API-backed category and delivery modes, got %q and %v", summary.Category, summary.DeliveryModes)
	}
	if !summary.IsFreeDelivery || summary.FollowerCount != 3100 || !summary.HasProBadge {
		t.Errorf("expected API-backed premium metadata, got %+v", summary)
	}
}

func ptrFloat(value float64) *float64 { return &value }
func ptrInt(value int) *int           { return &value }

func TestRowToDetail(t *testing.T) {
	row := DshStoreRow{
		ID:        "store-002",
		CreatedAt: time.Date(2026, 6, 21, 10, 0, 0, 0, time.UTC),
		UpdatedAt: time.Date(2026, 6, 21, 11, 0, 0, 0, time.UTC),
	}

	detail := RowToDetail(row)

	if detail.ID != "store-002" {
		t.Errorf("expected ID 'store-002', got '%s'", detail.ID)
	}
	expectedCreated := "2026-06-21T10:00:00Z"
	if detail.CreatedAt != expectedCreated {
		t.Errorf("expected CreatedAt '%s', got '%s'", expectedCreated, detail.CreatedAt)
	}
}
