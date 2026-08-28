package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
)

func TestDshActorSurface(t *testing.T) {
	t.Parallel()

	cases := map[string]string{
		"operator": "control-panel",
		"client":   "app-client",
		"partner":  "app-partner",
		"field":    "app-field",
		"captain":  "app-captain",
		"system":   "system",
	}

	for role, expected := range cases {
		role := role
		expected := expected
		t.Run(role, func(t *testing.T) {
			t.Parallel()
			if actual := dshActorSurface(role); actual != expected {
				t.Fatalf("dshActorSurface(%q) = %q, want %q", role, actual, expected)
			}
		})
	}
}

func TestDshActorSurfaceUnknownRoleIsSystem(t *testing.T) {
	t.Parallel()

	if actual := dshActorSurface("unknown"); actual != "system" {
		t.Fatalf("dshActorSurface(unknown) = %q, want system", actual)
	}
}

func TestRequireActorRejectsSystemSurfaceForMobileRole(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:           "client-1",
			OperatorContextID: "operator-context-1",
			Roles:             []string{"client"},
			AuthState:         "authenticated",
			SessionID:         "system-session-1",
			SessionSurface:    "system",
		})
	})

	request := httptest.NewRequest(http.MethodGet, "/dsh/client/orders", nil)
	request.Header.Set("Authorization", "Bearer system-token")
	response := httptest.NewRecorder()
	if _, ok := s.requireActor(response, request, "client"); ok {
		t.Fatal("system session must not cross into the app-client actor boundary")
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
}
