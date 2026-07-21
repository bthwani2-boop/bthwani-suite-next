package identityclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchActorsDecodesOpenAPIArrayAndSendsServiceIdentity(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/internal/actors/search" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		if got := r.URL.Query().Get("role"); got != "field" {
			t.Fatalf("unexpected role query %q", got)
		}
		if got := r.URL.Query().Get("q"); got != "ali" {
			t.Fatalf("unexpected search query %q", got)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer service-token" {
			t.Fatalf("unexpected authorization %q", got)
		}
		if got := r.Header.Get("X-Service-Caller"); got != "workforce" {
			t.Fatalf("unexpected service caller %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]ActorView{{
			ActorID: "field-1", Username: "ali", PhoneE164: "+967770000001",
			Roles: []string{"field"}, Active: true,
		}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	actors, err := client.SearchActors(context.Background(), "field", "ali")
	if err != nil {
		t.Fatalf("SearchActors returned error: %v", err)
	}
	if len(actors) != 1 || actors[0].ActorID != "field-1" {
		t.Fatalf("unexpected actors %#v", actors)
	}
}
