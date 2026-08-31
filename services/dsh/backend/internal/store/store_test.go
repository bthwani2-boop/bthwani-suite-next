package store

import (
	"encoding/json"
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
		ID:                      "store-001",
		PartnerID:               "partner-storefront-ready",
		PartnerActivationStatus: "client_visible",
		HasApprovedAssortment:   true,
		Slug:                    "test-store",
		DisplayName:             "Test Store",
		Status:                  StatusPublished,
		CityCode:                "sana",
		ServiceAreaCode:         "haddah",
		ServiceabilityStatus:    ServiceabilityServiceable,
		RatingAverage:           &rating,
		RatingCount:             200,
		DeliveryEtaMin:          &etaMin,
		DeliveryEtaMax:          &etaMax,
		IsVisible:               true,
		HeroImageURL:            &hero,
		LogoURL:                 &logo,
		Category:                CategoryGrocery,
		DeliveryModes:           []string{"delivery", "pickup"},
		IsFreeDelivery:          true,
		DistanceKM:              ptrFloat(2.1),
		FollowerCount:           3100,
		HasProBadge:             true,
		PointsMultiplier:        ptrInt(2),
		IsPopular:               true,
		PartnerReadiness:        "ready",
		CatalogApprovalStatus:   "approved",
		MarketingVisibility:     "visible",
		AddressLine:             "شارع حدة",
		CoverageSummary:         "حدة والمناطق المجاورة",
		OperatingHours:          "08:00-23:00",
		DeliveryReadiness:       "ready",
		PublicationDecision:     PublicationPublished,
		BlockingReasonCodes:     []string{},
		CreatedAt:               time.Date(2026, 6, 21, 10, 0, 0, 0, time.UTC),
		UpdatedAt:               time.Date(2026, 6, 21, 11, 0, 0, 0, time.UTC),
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
	if summary.PublicationDecision != PublicationPublished || len(summary.BlockingReasons) != 0 {
		t.Fatalf("expected store with all publication gates to be published, got decision=%s reasons=%v", summary.PublicationDecision, summary.BlockingReasons)
	}
}

func TestRowToSummaryNormalizesRequiredArrayFields(t *testing.T) {
	summary := RowToSummary(DshStoreRow{PublicationDecision: PublicationPublished})

	payload, err := json.Marshal(summary)
	if err != nil {
		t.Fatalf("marshal summary: %v", err)
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(payload, &fields); err != nil {
		t.Fatalf("decode summary: %v", err)
	}
	if got := string(fields["deliveryModes"]); got != "[]" {
		t.Fatalf("expected deliveryModes to serialize as [], got %s", got)
	}
	if got := string(fields["blockingReasons"]); got != "[]" {
		t.Fatalf("expected blockingReasons to serialize as [], got %s", got)
	}
}

func TestPublicationEligibilityRequiresAllGates(t *testing.T) {
	row := eligibleStoreRow()
	if !DiagnoseStorePublication(row).IsReady {
		t.Fatal("all gates should publish the store")
	}
	row.PublicationDecision = PublicationBlocked
	row.BlockingReasonCodes = []string{"CATALOG_NOT_APPROVED"}
	if DiagnoseStorePublication(row).IsReady {
		t.Fatal("canonical catalog blocker must hide the store")
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
			name:    "empty limit rejected",
			query:   url.Values{"limit": {""}},
			wantErr: "limit and offset must be integers",
		},
		{
			name:    "empty offset rejected",
			query:   url.Values{"offset": {""}},
			wantErr: "limit and offset must be integers",
		},
		{
			name:    "unknown parameter rejected",
			query:   url.Values{"x-schemathesis-unknown-property": {"42"}},
			wantErr: "invalid query parameter: x-schemathesis-unknown-property",
		},
		{
			name:    "unknown status rejected",
			query:   url.Values{"status": {"bogus"}},
			wantErr: "invalid status: bogus",
		},
		{
			name:    "unknown sort rejected",
			query:   url.Values{"sort": {"bogus"}},
			wantErr: "invalid sort: bogus",
		},
		{
			name:      "status active accepted",
			query:     url.Values{"status": {"published"}},
			wantLimit: 20,
			wantStat:  StatusPublished,
		},
		{
			name:      "status inactive accepted",
			query:     url.Values{"status": {"suspended"}},
			wantLimit: 20,
			wantStat:  StatusSuspended,
		},
		{
			name:      "status temporarily_closed accepted",
			query:     url.Values{"status": {"paused"}},
			wantLimit: 20,
			wantStat:  StatusPaused,
		},
		{
			name:      "status unavailable accepted",
			query:     url.Values{"status": {"closed"}},
			wantLimit: 20,
			wantStat:  StatusClosed,
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

func TestParseListQueryRejectsInvalidBooleanAndUnsafeText(t *testing.T) {
	for _, tc := range []struct {
		name    string
		query   url.Values
		wantErr string
	}{
		{name: "invalid visibility", query: url.Values{"isVisible": {"1"}}, wantErr: "invalid isVisible: must be true or false"},
		{name: "invalid free delivery", query: url.Values{"isFreeDelivery": {"1"}}, wantErr: "invalid isFreeDelivery: must be true or false"},
		{name: "nul city code", query: url.Values{"cityCode": {"sana\x00"}}, wantErr: "invalid cityCode"},
		{name: "invalid utf8 search", query: url.Values{"search": {string([]byte{0xff})}}, wantErr: "invalid search"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, errMsg := validateListQuery(tc.query)
			if errMsg != tc.wantErr {
				t.Fatalf("expected error %q, got %q", tc.wantErr, errMsg)
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
