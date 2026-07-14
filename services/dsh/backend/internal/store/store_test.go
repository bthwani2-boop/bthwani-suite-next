package store

import (
	"net/url"
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
		ID:                    "store-001",
		Slug:                  "test-store",
		DisplayName:           "Test Store",
		Status:                StatusActive,
		CityCode:              "sana",
		ServiceAreaCode:       "haddah",
		ServiceabilityStatus:  ServiceabilityServiceable,
		RatingAverage:         &rating,
		RatingCount:           200,
		DeliveryEtaMin:        &etaMin,
		DeliveryEtaMax:        &etaMax,
		IsVisible:             true,
		HeroImageURL:          &hero,
		LogoURL:               &logo,
		Category:              CategoryGrocery,
		DeliveryModes:         []string{"delivery", "pickup"},
		IsFreeDelivery:        true,
		DistanceKM:            ptrFloat(2.1),
		FollowerCount:         3100,
		HasProBadge:           true,
		PointsMultiplier:      ptrInt(2),
		IsPopular:             true,
		PartnerReadiness:      "ready",
		CatalogApprovalStatus: "approved",
		MarketingVisibility:   "visible",
		CreatedAt:             time.Date(2026, 6, 21, 10, 0, 0, 0, time.UTC),
		UpdatedAt:             time.Date(2026, 6, 21, 11, 0, 0, 0, time.UTC),
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
	if !summary.PublicationEligible {
		t.Fatal("expected store with all publication gates to be eligible")
	}
}

func TestPublicationEligibilityRequiresAllGates(t *testing.T) {
	row := DshStoreRow{
		Status: StatusActive, IsVisible: true,
		ServiceabilityStatus: ServiceabilityServiceable,
		PartnerReadiness:     "ready", CatalogApprovalStatus: "approved",
		MarketingVisibility: "visible",
	}
	if !IsPublicationEligible(row) {
		t.Fatal("all gates should publish the store")
	}
	row.CatalogApprovalStatus = "submitted"
	if IsPublicationEligible(row) {
		t.Fatal("unapproved catalog must hide the store")
	}
}

func ptrFloat(value float64) *float64 { return &value }
func ptrInt(value int) *int           { return &value }

func TestValidateListQuery(t *testing.T) {
	boolPtr := func(v bool) *bool { return &v }

	cases := []struct {
		name      string
		query     url.Values
		wantErr   string
		wantLimit int
		wantOff   int
		wantVis   *bool
		wantStat  DshStoreStatus
	}{
		{
			name:      "defaults",
			query:     url.Values{},
			wantLimit: 20,
			wantOff:   0,
		},
		{
			name:      "limit=20&offset=0 accepted",
			query:     url.Values{"limit": {"20"}, "offset": {"0"}},
			wantLimit: 20,
			wantOff:   0,
		},
		{
			name:    "limit=0 rejected",
			query:   url.Values{"limit": {"0"}},
			wantErr: "limit must be between 1 and 100",
		},
		{
			name:    "limit=101 rejected",
			query:   url.Values{"limit": {"101"}},
			wantErr: "limit must be between 1 and 100",
		},
		{
			name:    "offset=-1 rejected",
			query:   url.Values{"offset": {"-1"}},
			wantErr: "offset must be >= 0",
		},
		{
			name:    "non-numeric limit rejected",
			query:   url.Values{"limit": {"abc"}},
			wantErr: "limit and offset must be integers",
		},
		{
			name:    "non-numeric offset rejected",
			query:   url.Values{"offset": {"abc"}},
			wantErr: "limit and offset must be integers",
		},
		{
			name:    "unknown status rejected",
			query:   url.Values{"status": {"bogus"}},
			wantErr: "invalid status: bogus",
		},
		{
			name:      "status active accepted",
			query:     url.Values{"status": {"active"}},
			wantLimit: 20,
			wantStat:  StatusActive,
		},
		{
			name:      "status inactive accepted",
			query:     url.Values{"status": {"inactive"}},
			wantLimit: 20,
			wantStat:  StatusInactive,
		},
		{
			name:      "status temporarily_closed accepted",
			query:     url.Values{"status": {"temporarily_closed"}},
			wantLimit: 20,
			wantStat:  StatusTemporarilyClosed,
		},
		{
			name:      "status unavailable accepted",
			query:     url.Values{"status": {"unavailable"}},
			wantLimit: 20,
			wantStat:  StatusUnavailable,
		},
		{
			name:      "isVisible true",
			query:     url.Values{"isVisible": {"true"}},
			wantLimit: 20,
			wantVis:   boolPtr(true),
		},
		{
			name:      "isVisible false",
			query:     url.Values{"isVisible": {"false"}},
			wantLimit: 20,
			wantVis:   boolPtr(false),
		},
		{
			name:      "isVisible unset",
			query:     url.Values{},
			wantLimit: 20,
			wantVis:   nil,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, errMsg := validateListQuery(tc.query)
			if errMsg != tc.wantErr {
				t.Fatalf("expected error %q, got %q", tc.wantErr, errMsg)
			}
			if tc.wantErr != "" {
				return
			}
			if got.Limit != tc.wantLimit {
				t.Errorf("expected limit %d, got %d", tc.wantLimit, got.Limit)
			}
			if got.Offset != tc.wantOff {
				t.Errorf("expected offset %d, got %d", tc.wantOff, got.Offset)
			}
			if tc.wantStat != "" && got.Status != tc.wantStat {
				t.Errorf("expected status %q, got %q", tc.wantStat, got.Status)
			}
			if tc.wantVis == nil {
				if got.IsVisible != nil {
					t.Errorf("expected isVisible nil, got %v", *got.IsVisible)
				}
			} else {
				if got.IsVisible == nil || *got.IsVisible != *tc.wantVis {
					t.Errorf("expected isVisible %v, got %v", *tc.wantVis, got.IsVisible)
				}
			}
		})
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
