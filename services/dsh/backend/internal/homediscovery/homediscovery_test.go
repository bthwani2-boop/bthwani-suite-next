package homediscovery

import (
	"encoding/json"
	"testing"
)

func TestDefaultFilters(t *testing.T) {
	filters := DefaultFilters()
	if len(filters) != 5 {
		t.Fatalf("expected 5 filters, got %d", len(filters))
	}
	if filters[0].Kind != "all" {
		t.Errorf("first filter should be 'all', got %s", filters[0].Kind)
	}
	if !filters[0].IsActive {
		t.Error("first filter 'all' should be active by default")
	}
	kinds := map[string]bool{}
	for _, f := range filters {
		kinds[f.Kind] = true
	}
	for _, expected := range []string{"all", "favorites", "nearest", "new", "offers"} {
		if !kinds[expected] {
			t.Errorf("missing filter kind: %s", expected)
		}
	}
}

func TestHomeStoreJSONRetainsGovernedPublicationFields(t *testing.T) {
	payload, err := json.Marshal(HomeStore{
		PartnerReadiness:      "ready",
		CatalogApprovalStatus: "approved",
		MarketingVisibility:   "visible",
		PublicationDecision:   "PUBLISHED",
		BlockingReasons:       []string{},
	})
	if err != nil {
		t.Fatalf("marshal home store: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("decode home store: %v", err)
	}
	for _, field := range []string{"partnerReadiness", "catalogApprovalStatus", "marketingVisibility", "publicationDecision", "blockingReasons"} {
		if _, ok := decoded[field]; !ok {
			t.Fatalf("governed publication field %q was omitted from home store JSON: %s", field, payload)
		}
	}
}

func TestHomeStoreJSONNormalizesRequiredArrayFields(t *testing.T) {
	payload, err := json.Marshal(HomeStore{})
	if err != nil {
		t.Fatalf("marshal home store: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("decode home store JSON: %v", err)
	}
	for _, field := range []string{"blockingReasons", "deliveryModes"} {
		values, ok := decoded[field].([]any)
		if !ok || values == nil {
			t.Fatalf("required home store array %q must serialize as an array: %s", field, payload)
		}
	}
}

func TestEnsureHomeMarketingContentRequiresHeroMedia(t *testing.T) {
	withoutMedia := []HomeStore{{ID: "store-without-media", DisplayName: "Media-neutral store"}}
	banners, promos := ensureHomeMarketingContent(nil, nil, withoutMedia)
	if len(banners) != 0 || len(promos) != 0 {
		t.Fatalf("media-neutral stores must not derive marketing content: banners=%d promos=%d", len(banners), len(promos))
	}

	heroURL := "/dsh/public/media/approved-store-hero/card"
	withMedia := []HomeStore{{ID: "store-with-media", DisplayName: "Media store", HeroImageURL: &heroURL}}
	banners, promos = ensureHomeMarketingContent(nil, nil, withMedia)
	if len(banners) != 1 || len(promos) != 1 {
		t.Fatalf("store hero media should derive one banner and promo: banners=%d promos=%d", len(banners), len(promos))
	}
}

func TestValidateAdminInputByContentKind(t *testing.T) {
	valid := AdminContentInput{
		Title: "عرض صالح", ImageURL: "https://example.test/image.jpg",
		ActionType: "none", SortOrder: 1, IsActive: true,
	}
	for _, kind := range []string{"banners", "promos"} {
		if err := validateAdminInput(kind, valid); err != nil {
			t.Fatalf("%s should be valid: %v", kind, err)
		}
	}
	if err := validateAdminInput("categories", valid); err == nil {
		t.Fatal("home categories must be managed by the central catalog")
	}
	if err := validateAdminInput("unknown", valid); err == nil {
		t.Fatal("unknown content kind must fail")
	}
}
