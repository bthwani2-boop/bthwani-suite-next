package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
)

func TestRequireActorRejectsWrongSurface(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:           "field-1",
			Roles:             []string{"field"},
			SessionSurface:    "app-partner", // wrong surface
			AuthState:         "authenticated",
			OperatorContextID: "ctx",
		})
	})

	request := httptest.NewRequest(http.MethodPost, "/dsh/field/visits", nil)
	request.Header.Set("Authorization", "Bearer token")
	response := httptest.NewRecorder()

	actor, ok := s.requireActor(response, request, "field")
	if ok {
		t.Fatalf("expected requireActor to reject actor with wrong surface, got %#v", actor)
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("expected HTTP 403 Forbidden, got %d", response.Code)
	}
}
