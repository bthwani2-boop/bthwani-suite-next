package identityclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	workforceauth "workforce-api/internal/auth"
)

func TestActorDecodesCanonicalIdentityLifecycleWithoutLegacyActiveField(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/internal/actors/field-1" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"actorId":   "field-1",
			"username":  "local-field-001",
			"phoneE164": "+967770000011",
			"roles":     []string{"field"},
			"version":   4,
			"status":    "ACTIVE",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	actor, err := client.Actor(workforceauth.WithOperatorContext(context.Background(), "local-dsh"), "field-1")
	if err != nil {
		t.Fatalf("Actor returned error: %v", err)
	}
	if actor.Status != "ACTIVE" {
		t.Fatalf("expected ACTIVE status, got %q", actor.Status)
	}
	if !IsActorActive(actor) {
		t.Fatalf("canonical ACTIVE status must be treated as active: %#v", actor)
	}
}

func TestActorLifecycleFailsClosedForNonActiveStatuses(t *testing.T) {
	for _, status := range []string{"", "PROVISIONED", "PENDING_ACTIVATION", "SUSPENDED", "DEACTIVATED"} {
		t.Run(status, func(t *testing.T) {
			actor := ActorView{Status: status}
			if IsActorActive(actor) {
				t.Fatalf("status %q must not be treated as active", status)
			}
		})
	}
}

func TestActorLifecycleActiveComparisonIsCanonicalAndCaseInsensitive(t *testing.T) {
	actor := ActorView{Status: " active "}
	if !IsActorActive(actor) {
		t.Fatal("ACTIVE lifecycle status should tolerate transport whitespace/case")
	}
}
