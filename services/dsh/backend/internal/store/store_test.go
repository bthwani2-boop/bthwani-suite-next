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
		DisplayName:         "Test Store",
		Status:               StatusActive,
		CityCode:             "sana",
		ServiceAreaCode:      "haddah",
		ServiceabilityStatus: ServiceabilityServiceable,
		RatingAverage:        &rating,
		RatingCount:          200,
		DeliveryEtaMin:       &etaMin,
		DeliveryEtaMax:       &etaMax,
		IsVisible:            true,
		HeroImageUrl:         &hero,
		LogoUrl:              &logo,
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
}

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
