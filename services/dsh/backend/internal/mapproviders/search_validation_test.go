package mapproviders

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchNormalizesInputAndAcceptsGovernedResults(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/providers/maps/search" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		var input SearchInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatal(err)
		}
		if input.Query != "جامعة صنعاء" || input.Limit != 6 || len(input.CountryCodes) != 1 || input.CountryCodes[0] != "YE" {
			t.Fatalf("unexpected normalized input: %+v", input)
		}
		_ = json.NewEncoder(w).Encode(SearchResponse{Locations: []Location{{
			ProviderCode: " governed-provider ", ProviderPlaceID: " place-1 ", DisplayName: " جامعة صنعاء ",
			Latitude: 15.3694, Longitude: 44.1910, CountryCode: "ye", Confidence: 0.9,
		}}})
	}))
	defer server.Close()

	response, err := NewClient(server.URL).Search(context.Background(), "Bearer client", SearchInput{
		Query: "  جامعة صنعاء  ", CountryCodes: []string{" ye "},
	})
	if err != nil {
		t.Fatalf("Search() error = %v", err)
	}
	if len(response.Locations) != 1 || response.Locations[0].CountryCode != "YE" || response.Locations[0].DisplayName != "جامعة صنعاء" {
		t.Fatalf("unexpected response: %+v", response)
	}
}

func TestSearchRejectsMalformedProviderResult(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(SearchResponse{Locations: []Location{{
			ProviderCode: "provider", DisplayName: "missing place id", Latitude: 15.3, Longitude: 44.2,
		}}})
	}))
	defer server.Close()

	_, err := NewClient(server.URL).Search(context.Background(), "Bearer client", SearchInput{Query: "صنعاء"})
	if !errors.Is(err, ErrUncertain) {
		t.Fatalf("Search() error = %v, want ErrUncertain", err)
	}
}

func TestSearchRejectsInvalidInputBeforeProviderCall(t *testing.T) {
	_, err := NewClient("http://unused.invalid").Search(context.Background(), "", SearchInput{Query: "x"})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("Search() error = %v, want ErrInvalid", err)
	}
}
