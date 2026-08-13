package dshclient

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

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
	if err := client.ValidateProviderDocumentMedia(t.Context(), "field-1", "field", "media-1"); err != nil {
		t.Fatalf("ValidateProviderDocumentMedia() error = %v", err)
	}
}

func TestValidateProviderDocumentMediaRejectsInvalidReference(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := NewClient(server.URL, "dsh-token")
	if err := client.ValidateProviderDocumentMedia(t.Context(), "field-1", "field", "media-other"); err != ErrProviderMediaInvalid {
		t.Fatalf("expected ErrProviderMediaInvalid, got %v", err)
	}
}

func TestValidateProviderDocumentMediaFailsClosedWithoutServiceToken(t *testing.T) {
	client := NewClient("https://dsh.invalid", "")
	if err := client.ValidateProviderDocumentMedia(t.Context(), "field-1", "field", strings.Repeat("m", 8)); err != ErrUnavailable {
		t.Fatalf("expected ErrUnavailable, got %v", err)
	}
}
