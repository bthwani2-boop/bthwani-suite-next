package dshclient

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	workforceauth "workforce-api/internal/auth"
)

func TestValidateZoneUsesCanonicalServiceAreaCode(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/dsh/operator/platform/zones" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"zones":[{"id":"zone-1","name":"Sanaa","serviceAreaCode":"sana","isActive":true}]}`)
	}))
	defer server.Close()

	client := NewClient(server.URL, "dsh-token")
	zone, err := client.ValidateZone(t.Context(), "zone-1", "Bearer operator-token")
	if err != nil {
		t.Fatalf("ValidateZone() error = %v", err)
	}
	if zone.ServiceAreaCode != "sana" {
		t.Fatalf("ServiceAreaCode = %q, want sana", zone.ServiceAreaCode)
	}
}

func TestValidateProviderDocumentMediaUsesTrustedServiceBoundary(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/dsh/internal/workforce/provider-media-refs/validate" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer dsh-token" {
			t.Fatalf("unexpected authorization header %q", got)
		}
		if got := r.Header.Get("X-Service-Caller"); got != "workforce" {
			t.Fatalf("unexpected service caller %q", got)
		}
		body, _ := io.ReadAll(r.Body)
		if string(body) != `{"actorId":"field-1","actorRole":"field","mediaRef":"media-1"}` {
			t.Fatalf("unexpected request body %s", body)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	client := NewClient(server.URL, "dsh-token")
	if err := client.ValidateProviderDocumentMedia(workforceauth.WithOperatorContext(t.Context(), "context-main"), "field-1", "field", "media-1"); err != nil {
		t.Fatalf("ValidateProviderDocumentMedia() error = %v", err)
	}
}

func TestValidateProviderDocumentMediaRejectsInvalidReference(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := NewClient(server.URL, "dsh-token")
	if err := client.ValidateProviderDocumentMedia(workforceauth.WithOperatorContext(t.Context(), "context-main"), "field-1", "field", "media-other"); err != ErrProviderMediaInvalid {
		t.Fatalf("expected ErrProviderMediaInvalid, got %v", err)
	}
}

func TestValidateProviderDocumentMediaFailsClosedWithoutServiceToken(t *testing.T) {
	client := NewClient("https://dsh.invalid", "")
	if err := client.ValidateProviderDocumentMedia(t.Context(), "field-1", "field", strings.Repeat("m", 8)); err != ErrUnavailable {
		t.Fatalf("expected ErrUnavailable, got %v", err)
	}
}

func TestSyncAvailabilityProjectionUsesDeterministicIdentityAndAcknowledgement(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/dsh/internal/workforce/availability-projections" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		key := AvailabilityProjectionIdempotencyKey("context-main", "notice-1", 3)
		if r.Header.Get("Idempotency-Key") != key || r.Header.Get("X-Correlation-ID") != key {
			t.Fatalf("request did not carry deterministic identity: headers=%v", r.Header)
		}
		var input AvailabilityProjectionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if input.IdempotencyKey != key || input.SourceVersion != 3 {
			t.Fatalf("unexpected input: %+v", input)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"availabilityProjection": AvailabilityProjectionResult{
			AvailabilityProjectionInput: input,
			Idempotent:                  true,
		}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "dsh-token")
	input := AvailabilityProjectionInput{
		OperatorContextID: "context-main",
		NoticeID:          "notice-1",
		ActorType:         "captain",
		ActorID:           "captain-1",
		NoticeType:        "short_break",
		StartsAt:          time.Date(2026, 8, 26, 8, 0, 0, 0, time.UTC),
		EndsAt:            time.Date(2026, 8, 26, 9, 0, 0, 0, time.UTC),
		Status:            "active",
		SourceVersion:     3,
		SourceUpdatedAt:   time.Date(2026, 8, 26, 7, 0, 0, 0, time.UTC),
	}
	result, err := client.SyncAvailabilityProjectionWithResult(
		workforceauth.WithOperatorContext(t.Context(), "context-main"), input,
	)
	if err != nil {
		t.Fatalf("SyncAvailabilityProjectionWithResult() error = %v", err)
	}
	if !result.Idempotent || result.IdempotencyKey != AvailabilityProjectionIdempotencyKey("context-main", "notice-1", 3) {
		t.Fatalf("unexpected acknowledgement: %+v", result)
	}
}

func TestSyncAvailabilityProjectionClassifiesStaleAndMalformedResponses(t *testing.T) {
	tests := []struct {
		name   string
		body   string
		status int
		want   error
	}{
		{name: "stale", status: http.StatusConflict, body: `{"code":"STALE_SOURCE_VERSION"}`, want: ErrAvailabilityStale},
		{name: "malformed", status: http.StatusOK, body: `{}`, want: ErrAvailabilityMalformed},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(test.status)
				_, _ = io.WriteString(w, test.body)
			}))
			defer server.Close()
			client := NewClient(server.URL, "dsh-token")
			_, err := client.SyncAvailabilityProjectionWithResult(
				workforceauth.WithOperatorContext(t.Context(), "context-main"),
				AvailabilityProjectionInput{
					NoticeID:        "notice-1",
					ActorType:       "captain",
					ActorID:         "captain-1",
					NoticeType:      "short_break",
					StartsAt:        time.Date(2026, 8, 26, 8, 0, 0, 0, time.UTC),
					EndsAt:          time.Date(2026, 8, 26, 9, 0, 0, 0, time.UTC),
					Status:          "active",
					SourceVersion:   1,
					SourceUpdatedAt: time.Date(2026, 8, 26, 7, 0, 0, 0, time.UTC),
				},
			)
			if !errors.Is(err, test.want) {
				t.Fatalf("error = %v, want errors.Is(..., %v)", err, test.want)
			}
		})
	}
}

func TestReconcileAvailabilityProjectionDistinguishesMissingRemoteResult(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || !strings.HasPrefix(r.URL.Path, "/dsh/internal/workforce/availability-projections/") {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := NewClient(server.URL, "dsh-token")
	_, found, err := client.ReconcileAvailabilityProjection(
		workforceauth.WithOperatorContext(t.Context(), "context-main"),
		"context-main", AvailabilityProjectionIdempotencyKey("context-main", "notice-1", 1),
	)
	if err != nil || found {
		t.Fatalf("reconcile result = found:%v err:%v, want missing without error", found, err)
	}
}
