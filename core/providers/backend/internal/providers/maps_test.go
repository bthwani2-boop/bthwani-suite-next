package providers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestSearchWithMapProviderUsesGovernedNominatimConfiguration(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/search" {
			t.Fatalf("unexpected path %q", r.URL.Path)
		}
		if r.URL.Query().Get("q") != "Sanaa University" {
			t.Fatalf("unexpected query %q", r.URL.Query().Get("q"))
		}
		if r.URL.Query().Get("countrycodes") != "ye" {
			t.Fatalf("unexpected country filter %q", r.URL.Query().Get("countrycodes"))
		}
		if r.Header.Get("User-Agent") != "bthwani-map-tests/1.0" {
			t.Fatalf("unexpected user-agent %q", r.Header.Get("User-Agent"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"place_id":123,"lat":"15.3694","lon":"44.1910","display_name":"Sanaa University, Yemen","importance":0.8,"address":{"country_code":"ye","state":"Sana'a","city":"Sana'a"}}]`))
	}))
	defer server.Close()

	parameters, _ := json.Marshal(map[string]any{
		"protocol":     "nominatim",
		"baseUrl":      server.URL,
		"userAgent":    "bthwani-map-tests/1.0",
		"countryCodes": []string{"YE"},
	})
	provider := ExternalProvider{Code: "nominatim-primary", Active: true, Parameters: parameters}
	locations, err := searchWithMapProvider(context.Background(), provider, MapSearchInput{Query: "Sanaa University", Limit: 4})
	if err != nil {
		t.Fatalf("search failed: %v", err)
	}
	if len(locations) != 1 {
		t.Fatalf("expected one location, got %d", len(locations))
	}
	if locations[0].ProviderPlaceID != "123" || locations[0].CountryCode != "YE" || locations[0].Locality != "Sana'a" {
		t.Fatalf("unexpected normalized location: %+v", locations[0])
	}
}

func TestReverseWithMapProviderRejectsUnidentifiedClient(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"place_id":1,"lat":"15.3","lon":"44.2","display_name":"Sanaa","address":{"country_code":"ye"}}`))
	}))
	defer server.Close()

	parameters, _ := json.Marshal(map[string]any{"protocol": "nominatim", "baseUrl": server.URL})
	provider := ExternalProvider{Code: "nominatim", Active: true, Parameters: parameters}
	_, err := reverseWithMapProvider(context.Background(), provider, MapReverseInput{Latitude: 15.3, Longitude: 44.2})
	if err == nil || !strings.Contains(err.Error(), "userAgent") {
		t.Fatalf("expected configured user-agent failure, got %v", err)
	}
}

func TestMapEndpointRequiresTLSOutsideLocalhost(t *testing.T) {
	_, err := mapEndpoint("http://example.com", "/search")
	if err == nil {
		t.Fatal("expected non-local HTTP endpoint to fail")
	}
	endpoint, err := mapEndpoint("http://localhost:8080/api", "/search")
	if err != nil {
		t.Fatalf("local development endpoint should be allowed: %v", err)
	}
	if endpoint.Path != "/api/search" {
		t.Fatalf("unexpected path %q", endpoint.Path)
	}
}

func TestApplyAPIKeySupportsQueryAndHeader(t *testing.T) {
	query := url.Values{}
	header := http.Header{}
	applyAPIKey(query, header, mapProviderCredentials{APIKey: "secret", APIKeyQuery: "key", APIKeyHeader: "X-Map-Key"})
	if query.Get("key") != "secret" || header.Get("X-Map-Key") != "secret" {
		t.Fatal("expected API key to be applied to configured query and header targets")
	}
}

func TestNormalizedCountryCodesDropsInvalidAndDuplicates(t *testing.T) {
	result := normalizedCountryCodes([]string{"YE", "ye", "YEM", "", "SA"})
	if strings.Join(result, ",") != "ye,sa" {
		t.Fatalf("unexpected country codes: %v", result)
	}
}
