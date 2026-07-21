package mapproviders

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestReverseNormalizesAndReturnsTrustedLocation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var input ReverseInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatal(err)
		}
		if input.Language != "ar" || input.Latitude != 15.35 || input.Longitude != 44.20 {
			t.Fatalf("unexpected reverse input: %+v", input)
		}
		_ = json.NewEncoder(w).Encode(ReverseResponse{Location: Location{
			ProviderCode: " provider ", ProviderPlaceID: " reverse-1 ", DisplayName: " شارع حدة ",
			Latitude: 15.35, Longitude: 44.20, CountryCode: "ye", Confidence: 0.8,
		}})
	}))
	defer server.Close()

	response, err := NewClient(server.URL).Reverse(context.Background(), "Bearer client", ReverseInput{
		Latitude: 15.35, Longitude: 44.20, Language: " ar ",
	})
	if err != nil {
		t.Fatalf("Reverse() error = %v", err)
	}
	if response.Location.ProviderPlaceID != "reverse-1" || response.Location.CountryCode != "YE" {
		t.Fatalf("unexpected response: %+v", response)
	}
}

func TestReverseRejectsInvalidCoordinatesBeforeProviderCall(t *testing.T) {
	_, err := NewClient("http://unused.invalid").Reverse(context.Background(), "", ReverseInput{Latitude: 91, Longitude: 44})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("Reverse() error = %v, want ErrInvalid", err)
	}
}

func TestReverseRejectsUncertainProviderResult(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(ReverseResponse{Location: Location{
			ProviderCode: "provider", ProviderPlaceID: "reverse-1", DisplayName: "", Latitude: 15.35, Longitude: 44.20,
		}})
	}))
	defer server.Close()

	_, err := NewClient(server.URL).Reverse(context.Background(), "Bearer client", ReverseInput{Latitude: 15.35, Longitude: 44.20})
	if !errors.Is(err, ErrUncertain) {
		t.Fatalf("Reverse() error = %v, want ErrUncertain", err)
	}
}
